-- Amazon Pulse: convert product_snapshots to monthly range partitions and
-- add the daily rollup used for week/month/year reports.
-- Apply after `prisma migrate deploy` on an empty table.

BEGIN;

ALTER TABLE product_snapshots RENAME TO product_snapshots_legacy;

CREATE TABLE product_snapshots (LIKE product_snapshots_legacy INCLUDING DEFAULTS INCLUDING CONSTRAINTS)
  PARTITION BY RANGE (captured_at);
ALTER TABLE product_snapshots ADD PRIMARY KEY (id, captured_at);
ALTER TABLE product_snapshots
  ADD CONSTRAINT product_snapshots_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX product_snapshots_dedupe ON product_snapshots (product_id, captured_date, data_source, captured_at);
CREATE INDEX product_snapshots_product_time ON product_snapshots (product_id, captured_at DESC);
CREATE INDEX product_snapshots_day_demand ON product_snapshots (captured_date, estimated_demand DESC);

INSERT INTO product_snapshots SELECT * FROM product_snapshots_legacy;
-- The id sequence belongs to the old table; move it before dropping.
ALTER SEQUENCE product_snapshots_id_seq OWNED BY product_snapshots.id;
DROP TABLE product_snapshots_legacy;

-- Create a month's partition; run monthly from the ingestion worker (or pg_partman).
CREATE OR REPLACE FUNCTION ensure_snapshot_partition(month_start date) RETURNS void AS $$
DECLARE
  part text := format('product_snapshots_%s', to_char(month_start, 'YYYY_MM'));
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF product_snapshots FOR VALUES FROM (%L) TO (%L)',
    part, month_start, (month_start + interval '1 month')::date
  );
END $$ LANGUAGE plpgsql;

SELECT ensure_snapshot_partition(date_trunc('month', now())::date);
SELECT ensure_snapshot_partition((date_trunc('month', now()) + interval '1 month')::date);

-- One row per product per day; week/month/year reports read this.
CREATE MATERIALIZED VIEW daily_product_rollups AS
SELECT
  product_id,
  captured_date AS day,
  avg(estimated_demand)       AS avg_demand,
  avg(best_sellers_rank)      AS avg_bsr,
  min(best_sellers_rank)      AS best_bsr,
  (array_agg(price ORDER BY captured_at DESC))[1]        AS close_price,
  (array_agg(review_count ORDER BY captured_at DESC))[1] AS close_reviews,
  (array_agg(rating ORDER BY captured_at DESC))[1]       AS close_rating,
  array_agg(DISTINCT data_source)                        AS sources
FROM product_snapshots
GROUP BY product_id, captured_date;

CREATE UNIQUE INDEX daily_product_rollups_pk ON daily_product_rollups (product_id, day);
CREATE INDEX daily_product_rollups_day ON daily_product_rollups (day, avg_demand DESC);
-- Refresh after each ingestion run:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY daily_product_rollups;

COMMIT;
