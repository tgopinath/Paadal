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
- Database schema: [`prisma/schema.prisma`](prisma/schema.prisma) and [`db/partitioning.sql`](db/partitioning.sql)

## What works today (Phases 1–4, demo data)

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
| Watchlist, collections and threshold alerts | ✅ saved on the device |
| Reports: 7 report types, CSV export, print / save as PDF | ✅ (native Excel planned) |
| Data Sources: provider status from env vars, CSV format spec | ✅ (ingestion planned) |
| Installable PWA: manifest, icons, service worker, offline page | ✅ |
| Email/password auth, Postgres repository, ingestion worker, AI assistant | Planned (Phases 4–6) |

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
npm test        # analytics unit tests (periods, GST profit, coverage, CSV)
npm run build
```

## Deploy (Vercel)

1. Import the repository in Vercel and set **Root Directory** to `amazon-pulse`.
2. Framework preset: Next.js. The build and install commands use the defaults.
3. Add the environment variables below. For the demo, `APP_MODE=demo` is enough.
4. Deploy. The app can be installed from the browser on Android (Chrome →
   *Install app*) and iOS (Safari → Share → *Add to Home Screen*).

### Database (production, Phase 6)

```bash
npx prisma migrate deploy                 # create tables from prisma/schema.prisma
psql "$DATABASE_URL" -f db/partitioning.sql   # monthly partitions + daily rollup view
```

Create next month's partition on a schedule
(`SELECT ensure_snapshot_partition(date_trunc('month', now() + interval '1 month')::date);`)
and refresh `daily_product_rollups` after each ingestion run.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `APP_MODE` | no (default `demo`) | `demo` uses the synthetic dataset; `production` refuses demo data |
| `DATABASE_URL` | production | PostgreSQL connection string |
| `AUTH_SECRET` | production | Session signing secret (32+ random bytes) |
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
prisma/, db/             PostgreSQL schema and partitioning
tests/                   unit tests (node:test via tsx)
```
