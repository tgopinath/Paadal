# Amazon Pulse

**Discover demand. Understand trends. Find opportunities.**

A product-intelligence dashboard for Amazon India sellers. It records regular
snapshots of product data from permitted sources and turns them into
rankings, period comparisons, trend and opportunity scores, and GST-aware
profit estimates.

> **Demo data.** Out of the box the app runs on a deterministic, synthetic
> dataset (ASINs start with `B0DEMO`, brands are invented). Every screen shows a
> demo banner, and exports are labelled `DEMO`. Setting `APP_MODE=production`
> turns demo data off.

- Architecture, screen map, data model and scoring methods: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Database schema: [`db/migrations/`](db/migrations) (plain SQL, `npm run db:migrate`)

## What works today

| Area | Status |
|---|---|
| Responsive shell: sidebar on desktop, 5-tab bottom bar on mobile, global search | ✅ |
| Overview: 6 KPI cards with comparison and sparkline, demand over time (day/week/month/year, area/line/bar), top 10/25/50/100, category performance, 4 period comparisons | ✅ |
| Product Explorer: table and card views, 11 filters, 6 sort orders, pagination | ✅ |
| Product detail: 30-day / 12-week / 12-month / yearly charts for demand, BSR, price and reviews; data-backed summary; trend, opportunity and seasonality | ✅ |
| Historical Analytics: any day, week, month, year or custom range; top 10/25/50; entering and dropping; category mix; demand and price movement; coverage notes; "Historical data not available" | ✅ |
| Trending Now: 7 lenses, internal trend score with signal breakdown | ✅ |
| Opportunity Finder: 7-factor score with High/Medium/Low class and explanation; GST/ITC-aware profit calculator | ✅ |
| Comparison of up to 5 products (table and chart) | ✅ |
| Watchlist, collections and threshold alerts | ✅ on the device in demo mode; saved to the account in production |
| Reports: 7 report types, CSV and Excel export, print / save as PDF | ✅ |
| Data Sources: provider status, CSV history import with preview, collection run log | ✅ |
| Installable PWA: manifest, icons, service worker, offline page | ✅ |
| Production mode on PostgreSQL (partitioned snapshots, daily rollups) | ✅ |
| Email/password accounts (scrypt, database sessions, sign-in throttling) | ✅ |
| Scheduled job: partitions, rollups, alert evaluation, cleanup | ✅ |
| Amazon Pulse AI (Claude, answers only from analytics tools) | ✅ needs `ANTHROPIC_API_KEY` |
| PA-API / SP-API / licensed-provider collection adapters | Waiting for credentials (see below) |
| Alert delivery by email or push | Not started (needs an email provider) |

## Run locally

```bash
cd amazon-pulse
npm install
cp .env.example .env.local   # optional; defaults to demo mode
npm run dev                  # http://localhost:3000
```

Checks:

```bash
npm run lint
npm run typecheck
npm test        # analytics, CSV import and AI tool tests
npm run build
TEST_DATABASE_URL=postgres://… npm run test:db   # against a disposable, migrated database
```

Run production mode locally:

```bash
createdb amazon_pulse
DATABASE_URL=postgres://localhost/amazon_pulse npm run db:migrate
APP_MODE=production DATABASE_URL=postgres://localhost/amazon_pulse npm run dev
# Sign up at /signup, then import history on /data-sources.
```

## Deploy (Vercel)

1. Import the repository in Vercel and set **Root Directory** to `amazon-pulse`.
2. Framework preset: Next.js. The build and install commands use the defaults.
3. Add the environment variables below. For the demo, `APP_MODE=demo` is enough.
4. For production: create a PostgreSQL database (Neon, Supabase, RDS, …) and
   use its **pooled** connection string as `DATABASE_URL`. Migrations run
   automatically at the start of every build (`npm run build`), and are skipped
   when `DATABASE_URL` isn't set.
5. Set `CRON_SECRET`. `vercel.json` schedules `/api/ingest` daily at 01:17 UTC
   (06:47 IST); Vercel sends the secret automatically.
6. Deploy. The app can be installed from the browser on Android (Chrome →
   *Install app*) and iOS (Safari → Share → *Add to Home Screen*).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `APP_MODE` | no (default `demo`) | `demo` uses the synthetic dataset; `production` refuses demo data |
| `DATABASE_URL` | production | PostgreSQL connection string (pooled on serverless) |
| `DATABASE_POOL_MAX` | no (default 5) | Connections per server instance |
| `CRON_SECRET` | production | Bearer secret for the scheduled `/api/ingest` job |
| `ANTHROPIC_API_KEY` | for AI | Enables Amazon Pulse AI (Claude Opus 5.5) |
| `AI_QUESTIONS_PER_HOUR` | no (default 30) | Per-user limit on AI questions |
| `PAAPI_ACCESS_KEY`, `PAAPI_SECRET_KEY` | optional | Product Advertising API credentials (secret) |
| `PAAPI_PARTNER_TAG` | with PA-API | Associates tracking ID, e.g. `yourtag-21` |
| `PAAPI_HOST` | with PA-API | `webservices.amazon.in` |
| `SPAPI_LWA_CLIENT_ID`, `SPAPI_LWA_CLIENT_SECRET`, `SPAPI_REFRESH_TOKEN` | optional | Selling Partner API (your own account) |
| `SPAPI_MARKETPLACE_ID` | with SP-API | `A21TJRUUN4KGV` (Amazon.in) |
| `SPAPI_ENDPOINT` | with SP-API | `https://sellingpartnerapi-eu.amazon.com` |
| `RESEARCH_API_PROVIDER`, `RESEARCH_API_KEY` | optional | Licensed research provider |

Credentials are read only on the server. The Data Sources page shows whether
each variable is set, never its value.

## Data integrity

- Verified sales (your own, via SP-API), observed listing data, estimated
  demand and internal scores are stored and labelled separately.
- The **demand index** (0–100) comes from Best Sellers Rank. It measures
  relative popularity, not units sold.
- Period reports use only the snapshots captured in that period. Gaps show
  as gaps, partial coverage is stated, and periods with no data show
  *Historical data not available*.
- No scraping of Amazon shopping pages, and no bypassing of CAPTCHA,
  authentication, rate limits or anti-bot protection.

## Project layout

```
src/app/                 routes (App Router); every page streams data inside <Suspense>
src/components/          UI primitives (shadcn-style on Radix), charts (Recharts), feature components
src/lib/analytics/       pure analytics: periods, engine, trend, opportunity, profit, narrative
src/lib/data/            repository (demo / production) and the demo generator
src/lib/providers/       permitted data-source adapters (PA-API, SP-API, licensed, CSV)
src/lib/auth/            password hashing and database sessions
src/lib/ai/              Amazon Pulse AI: tools over the analytics engine + Claude call
db/migrations/           PostgreSQL schema (plain SQL, applied by scripts/migrate.mts)
tests/                   unit and database integration tests (node:test via tsx)
```
