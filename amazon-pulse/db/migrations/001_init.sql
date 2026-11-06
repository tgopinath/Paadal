-- Amazon Pulse: initial schema (PostgreSQL 14+).
-- Applied by `npm run db:migrate` (scripts/migrate.ts) inside one transaction.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

CREATE TYPE data_source AS ENUM ('demo', 'pa_api', 'sp_api', 'licensed', 'csv');
-- verified: your own sales (SP-API) · observed: listing data as returned
-- estimated: modelled values (demand index, provider unit estimates)
CREATE TYPE source_confidence AS ENUM ('verified', 'observed', 'estimated');
CREATE TYPE alert_type AS ENUM ('price_below', 'rank_better_than', 'trend_score_above', 'demand_change_above');

-- Users & sessions ----------------------------------------------------------

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text,
  email         text NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower ON users (lower(email));

-- Only a SHA-256 of the session token is stored; the token lives in the cookie.
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user ON sessions (user_id);
CREATE INDEX sessions_expiry ON sessions (expires_at);

-- Failed sign-in attempts, for throttling.
CREATE TABLE login_attempts (
  id         bigserial PRIMARY KEY,
  email      text NOT NULL,
  ip         text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_email_time ON login_attempts (lower(email), created_at DESC);

-- Catalogue -----------------------------------------------------------------

CREATE TABLE categories (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  parent_category text REFERENCES categories(id),
  amazon_node_id  text
);

INSERT INTO categories (id, name) VALUES
  ('electronics', 'Electronics'),
  ('home-kitchen', 'Home & Kitchen'),
  ('fashion', 'Fashion'),
  ('beauty', 'Beauty & Personal Care'),
  ('sports', 'Sports & Fitness'),
  ('toys', 'Toys & Games'),
  ('grocery', 'Grocery'),
  ('office', 'Office Products'),
  ('other', 'Other');

CREATE TABLE products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asin        text NOT NULL CHECK (asin ~ '^[A-Z0-9]{10}$'),
  marketplace text NOT NULL DEFAULT 'IN',
  title       text NOT NULL,
  brand       text,
  category_id text NOT NULL DEFAULT 'other' REFERENCES categories(id),
  subcategory text,
  image_url   text,
  amazon_url  text,
  first_seen  date NOT NULL DEFAULT current_date,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketplace, asin)
);
CREATE INDEX products_category ON products (category_id);
CREATE INDEX products_brand ON products (brand);

-- Collection runs, so freshness and gaps can be reported honestly.
CREATE TABLE ingestion_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source       data_source NOT NULL,
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  status       text NOT NULL CHECK (status IN ('running', 'succeeded', 'partial', 'failed')),
  products_ok  int NOT NULL DEFAULT 0,
  products_err int NOT NULL DEFAULT 0,
  rows_written int NOT NULL DEFAULT 0,
  note         text,
  error        text
);
CREATE INDEX ingestion_runs_recent ON ingestion_runs (source, started_at DESC);

-- Snapshots: append-only, monthly range partitions --------------------------
-- Nullable fields mean "the source did not provide it", never zero.

CREATE TABLE product_snapshots (
  id                bigint GENERATED ALWAYS AS IDENTITY,
  product_id        uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  captured_at       timestamptz NOT NULL,
  captured_date     date NOT NULL, -- calendar date in Asia/Kolkata
  price             numeric(12, 2) CHECK (price >= 0),
  list_price        numeric(12, 2) CHECK (list_price >= 0),
  rating            numeric(2, 1) CHECK (rating BETWEEN 0 AND 5),
  review_count      int CHECK (review_count >= 0),
  best_sellers_rank int CHECK (best_sellers_rank > 0),
  bsr_category      text,
  estimated_demand  numeric(5, 1) CHECK (estimated_demand BETWEEN 0 AND 100),
  estimated_units   int, -- a provider's estimate, labelled as such
  verified_units    int, -- your own sales only (SP-API / your exports)
  data_source       data_source NOT NULL,
  source_confidence source_confidence NOT NULL,
  ingestion_run_id  uuid REFERENCES ingestion_runs(id),
  PRIMARY KEY (id, captured_at)
) PARTITION BY RANGE (captured_at);

-- One observation per product, day and source; re-imports update in place.
CREATE UNIQUE INDEX product_snapshots_dedupe ON product_snapshots (product_id, captured_date, data_source, captured_at);
CREATE INDEX product_snapshots_product_time ON product_snapshots (product_id, captured_at DESC);
CREATE INDEX product_snapshots_day_demand ON product_snapshots (captured_date, estimated_demand DESC);

CREATE OR REPLACE FUNCTION ensure_snapshot_partition(month_start date) RETURNS void AS $$
DECLARE
  m    date := date_trunc('month', month_start)::date;
  part text := format('product_snapshots_%s', to_char(m, 'YYYY_MM'));
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF product_snapshots FOR VALUES FROM (%L) TO (%L)',
    part, (m::timestamp AT TIME ZONE 'UTC'), ((m + interval '1 month')::timestamp AT TIME ZONE 'UTC')
  );
END $$ LANGUAGE plpgsql;

-- Partitions for older history are created on demand by the importer.
SELECT ensure_snapshot_partition(date_trunc('month', now())::date);
SELECT ensure_snapshot_partition((date_trunc('month', now()) + interval '1 month')::date);

-- One row per product per day, used by every report. Demo rows are excluded
-- here so synthetic data can never reach production analytics.
CREATE MATERIALIZED VIEW daily_product_rollups AS
SELECT
  product_id,
  captured_date AS day,
  round(avg(estimated_demand), 1)                              AS avg_demand,
  round(avg(best_sellers_rank))::int                           AS avg_bsr,
  (array_agg(price ORDER BY captured_at DESC))[1]              AS close_price,
  (array_agg(list_price ORDER BY captured_at DESC))[1]         AS close_list_price,
  (array_agg(review_count ORDER BY captured_at DESC))[1]       AS close_reviews,
  (array_agg(rating ORDER BY captured_at DESC))[1]             AS close_rating,
  sum(verified_units)                                          AS verified_units,
  array_agg(DISTINCT data_source)                              AS sources
FROM product_snapshots
WHERE data_source <> 'demo'
GROUP BY product_id, captured_date;

CREATE UNIQUE INDEX daily_product_rollups_pk ON daily_product_rollups (product_id, day);
CREATE INDEX daily_product_rollups_day ON daily_product_rollups (day, avg_demand DESC);

-- User data -----------------------------------------------------------------

CREATE TABLE watchlists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX watchlists_user ON watchlists (user_id);
CREATE UNIQUE INDEX watchlists_one_default ON watchlists (user_id) WHERE is_default;

CREATE TABLE watchlist_products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id uuid NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (watchlist_id, product_id)
);

CREATE TABLE alerts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  alert_type        alert_type NOT NULL,
  threshold         numeric(12, 2) NOT NULL,
  enabled           boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX alerts_user ON alerts (user_id);
CREATE INDEX alerts_product_enabled ON alerts (product_id) WHERE enabled;

CREATE TABLE user_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  date_start  date,
  date_end    date,
  filters     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_reports_recent ON user_reports (user_id, created_at DESC);

CREATE TABLE cost_profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id       uuid REFERENCES products(id) ON DELETE CASCADE,
  purchase_cost    numeric(12, 2) NOT NULL,
  purchase_gst_pct numeric(4, 2) NOT NULL,
  shipping         numeric(12, 2) NOT NULL DEFAULT 0,
  packaging        numeric(12, 2) NOT NULL DEFAULT 0,
  other            numeric(12, 2) NOT NULL DEFAULT 0,
  selling_price    numeric(12, 2),
  claims_itc       boolean NOT NULL DEFAULT true,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
