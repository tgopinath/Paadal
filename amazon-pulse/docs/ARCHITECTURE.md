# Amazon Pulse — Product Architecture

> Discover demand. Understand trends. Find opportunities.

Amazon Pulse is a product-intelligence dashboard for sellers on Amazon India
(amazon.in). It stores regular **snapshots** of product data from permitted
sources and turns them into rankings, trend signals, period comparisons and
profitability estimates.

This document is the source of truth for the product structure. It covers the
data-integrity rules, the screen map, the data model, the analytics methods,
and the delivery phases.

---

## 1. Data-integrity rules (non-negotiable)

1. **Four kinds of number, never mixed.** Every metric belongs to exactly one
   of these:
   | Kind | Example | Where it comes from |
   |---|---|---|
   | **Verified sales** | Units you sold last week | SP-API reports for *your own* seller account only |
   | **Observed listing data** | Price, rating, review count, Best Sellers Rank | PA-API, SP-API catalog, licensed providers, CSV |
   | **Estimated demand** | Demand index 0–100 | Our model, derived from BSR (and from units where a licensed provider supplies them) |
   | **Internal scores** | Trend score, opportunity score | Our formulas, with every input shown |

   The UI labels each kind. Amazon publishes no marketplace-wide sales figures,
   and Amazon Pulse never claims to have them.
2. **History only comes from snapshots.** A period report reads only the
   snapshots captured inside that period. If none exist, the UI shows
   *"Historical data not available"*. Today's data is never relabelled as
   history.
3. **Coverage is always visible.** Every period view states how many days in
   the period have snapshots (e.g. "18 of 31 days covered"). Partial coverage
   is flagged.
4. **Demo data is quarantined.** Demo mode uses a deterministic synthetic
   dataset. A persistent banner and the `demo` source tag mark it, and it can't
   run when `APP_MODE=production`.
5. **Permitted sources only.** No scraping of Amazon shopping pages, and no
   bypassing of CAPTCHA, authentication, rate limits or anti-bot measures.

---

## 2. System architecture

```
┌─────────────────────────── Next.js app (Vercel) ───────────────────────────┐
│  App Router UI  (Server Components render data, Client Components chart)  │
│        │                                                                   │
│  Route handlers /api/*  (exports, AI assistant, ingestion webhooks)        │
│        │                                                                   │
│  Repository layer  src/lib/data/repository.ts                              │
│        ├── DemoRepository      (synthetic, in-memory, deterministic)       │
│        └── PostgresRepository  (Phase 2: Prisma, read replicas later)      │
│        │                                                                   │
│  Analytics engine  src/lib/analytics/*  (pure functions, provider-agnostic)│
└────────┬───────────────────────────────────────────────────────────────────┘
         │
┌────────┴──────────── Ingestion worker (Phase 6, cron / queue) ─────────────┐
│  Provider adapters  src/lib/providers/*                                    │
│   ├── PA-API 5.0 (product data; eligibility + rate limits apply)           │
│   ├── SP-API (your seller account: catalog, pricing, sales & traffic)      │
│   ├── Licensed research API (e.g. Keepa, Jungle Scout — contract needed)   │
│   └── CSV import (user-uploaded historical data)                           │
│  → normalise → upsert products → insert product_snapshots (append-only)    │
└────────┬───────────────────────────────────────────────────────────────────┘
         │
     PostgreSQL  (snapshots partitioned by month; rollups as materialised views)
```

Every analytics function takes plain arrays of `Product` and `Snapshot`, so
the same code serves demo data, Postgres data and test fixtures.

---

## 3. Screen map

| Route | Screen | Purpose | Phase |
|---|---|---|---|
| `/` | Overview | KPI cards, demand over time, top rankings, category performance, period comparison | 1 ✅ |
| `/products` | Product Explorer | Table + card views, filters, sorting, watchlist toggle | 2 ✅ |
| `/products/[asin]` | Product Detail | Price, BSR, demand and review history; 30-day / 12-week / 12-month / yearly charts; data-backed summary | 2 ✅ |
| `/history` | Historical Analytics | Any day / week / month / year / custom range; top 10/25/50; entering and leaving the rankings; coverage | 3 ✅ |
| `/trending` | Trending Now | Trend score 0–100 with signal breakdown, seven trend lenses | 4 ✅ |
| `/categories` | Categories | Category share, demand and price trend | 3 ✅ |
| `/compare` | Product Comparison | Up to 5 products, table + charts | 4 ✅ |
| `/opportunities` | Opportunity Finder | Opportunity score, classification, profit calculator (GST-aware) | 4 ✅ |
| `/watchlist` | My Watchlist | Saved products, collections, alerts | 5 (watchlist ✅ local; alerts planned) |
| `/reports` | Reports | Daily / weekly / monthly / yearly / category / trending / opportunity reports; CSV ✅, Excel and PDF planned | 5 (partial) |
| `/ai` | Amazon Pulse AI | Questions answered from database records, with metrics, period, freshness and limits | 4 (planned) |
| `/data-sources` | Data Sources | Provider status, credential configuration (env and secrets manager), CSV import | 6 (status ✅) |
| `/settings` | Settings | Profile, fee assumptions, GST defaults, display | 1 (partial) |

**Navigation.** On desktop (≥1024px), a sidebar with all 12 sections. On
mobile, a bottom bar with Home / Discover / Trends / Watchlist / Profile, and
the remaining sections are reached from Profile.

---

## 4. Design system

| Token | Value | Use |
|---|---|---|
| `--background` | `#FFFFFF` | Page |
| `--surface` | `#F7F8FA` | Soft grey panels, table headers |
| `--border` | `#E6E8EC` | Subtle 1px borders |
| `--foreground` | `#1F2328` | Charcoal text |
| `--muted-foreground` | `#6B7280` | Secondary text |
| `--primary` | `#2563EB` | Blue accent, primary series |
| `--positive` | `#15803D` | Up / good |
| `--negative` | `#B91C1C` | Down / bad |
| `--warning` | `#B45309` | Partial data, demo banner |

* **Type:** Geist Sans for the UI and Geist Mono for ASINs and figures (tabular
  numbers). Scale: 12 / 13 / 14 / 16 / 20 / 24 / 30.
* **Spacing:** 4px base. Cards use 20–24px padding and 16–24px gaps.
* **Radius:** 12px cards, 8px controls, full pills.
* **Grid:** 12 columns on desktop, KPI rows of 6 → 3 → 2 columns, single
  column on mobile.
* **Charts:** Recharts. Single-series charts use the blue accent, comparisons
  use blue against grey (the previous period), and categories use a fixed
  8-colour categorical palette. Gridlines are hairlines and values use tabular
  numbers.
* **States:** Every data view has a skeleton loader (Suspense fallback), an
  empty state with a reason and a next action, an error boundary with retry,
  and a "Historical data not available" state.
* **Accessibility:** WCAG AA contrast, visible focus rings, 44px touch
  targets on mobile, colour never used alone (arrows and signs come with it),
  `aria-label`s on icon buttons.

---

## 5. Data model (PostgreSQL)

The full Prisma schema is in [`prisma/schema.prisma`](../prisma/schema.prisma).
Key decisions:

* `product_snapshots` is **append-only** and range-partitioned by month on
  `captured_at`. Its index is `(product_id, captured_at DESC)` for product
  history, plus `(captured_at, estimated_demand DESC)` for period rankings.
* Each snapshot stores `data_source` and `source_confidence`, so verified,
  observed and estimated values stay separate.
* `daily_product_rollups` is a materialised view (one row per product per day)
  that feeds weekly, monthly and yearly aggregates without scanning raw
  snapshots.
* `ingestion_runs` records every collection job, so data freshness and gaps
  can be reported.
* User-owned tables (`watchlists`, `alerts`, `user_reports`, `cost_profiles`)
  cascade on user delete.

---

## 6. Analytics methods

All of these live in `src/lib/analytics/` as pure, unit-testable functions.

### Estimated demand index (0–100)
BSR is mapped to a log scale within its category:
`demand = 100 × (1 − log10(bsr) / log10(maxRank))`, clamped to 0–100. It is
**relative popularity, not units**. When a licensed provider supplies unit
estimates, they are stored separately as `estimated_units` and labelled as the
provider's estimate.

### Period ranking
For a period P, each product's score is the mean demand index over the
snapshots inside P, with at least 1 observation required. Ties break on mean
BSR. *Entering* means in the top N for P but not for the previous comparable
period; *dropping out* is the reverse.

### Trend score (0–100, internal)
This compares the last 14 days with the 14 days before them.

| Signal | Weight | Measure |
|---|---|---|
| BSR movement | 40% | % improvement in mean BSR |
| Demand change | 25% | Change in mean demand index |
| Review growth | 20% | New reviews per day, relative to the existing base |
| Price movement | 15% | Price drop (a mild positive) or rise |

Each signal maps to 0–100 through a bounded linear transform. A score of 50 is
neutral.

### Opportunity score (0–100, internal)
| Factor | Weight | Proxy |
|---|---|---|
| Demand | 25% | 30-day mean demand index |
| Competition | 20% | Review count of the listing and subcategory review density (lower is better) |
| Margin potential | 20% | Estimated net margin from the fee model and category cost ratio (user overrides take priority) |
| Price band | 10% | ₹300–₹2,500 scores highest |
| Return risk | 10% | Category return-risk table |
| Seasonality | 5% | Coefficient of variation of the monthly demand index |
| Rating gap | 10% | Room to compete when ratings are below 4.2 |

The score is classified as High (≥ 70), Medium (55–69) or Low (< 55). Every
factor's contribution is shown.

### Profit calculator (India, GST-aware)
* The Amazon.in selling price **includes GST**, so the net realisation is
  `SP ÷ (1 + GST rate)`. Output GST is passed through to the government and is
  not revenue.
* If the seller is registered and claims input tax credit (ITC): the purchase
  cost is taken net of input GST, and the 18% GST on Amazon fees is
  recoverable, so neither counts as an expense. Without ITC, both are costs.
* TCS (Sec. 52) and TDS (Sec. 194-O) withheld by Amazon are creditable
  against tax liability, so they are shown as cash-flow items, not expenses.
* `Gross profit = net SP − net purchase cost`
* `Net profit = net SP − net purchase cost − Amazon fees (− fee GST if no ITC)
  − shipping − packaging − other`
* `Margin = net profit ÷ net SP × 100`
* The referral and closing fee tables are **editable estimates**. Sellers must
  check them against the current Amazon.in fee schedule.

---

## 7. Delivery phases

| Phase | Scope | Status |
|---|---|---|
| 1 Foundation | Project setup, design system, responsive shell, navigation, Overview dashboard, PWA manifest | ✅ This release |
| 2 Product intelligence | Explorer, filters, search, product detail; Postgres schema | ✅ UI + schema (demo repository) |
| 3 Analytics | Period engine, historical snapshots, comparisons, coverage | ✅ Engine + UI on demo data |
| 4 Intelligence | Trending, opportunity finder, comparison | ✅ ; AI assistant planned |
| 5 Business | Watchlist ✅ (device-local), collections, alerts, Excel and PDF exports | Partial |
| 6 Integration | Auth, Postgres repository, ingestion worker, PA-API/SP-API adapters, CSV import, deployment | Planned |

Authentication is planned for Phase 6, together with Postgres. It needs a real
user table, so it is not stubbed with a fake login screen.
