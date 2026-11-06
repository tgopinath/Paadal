# Amazon Pulse: handoff guide

Use this guide to continue the setup in a new Claude session or account.

## Where the code is

- **Repository:** `github.com/tgopinath/Paadal`, branch **`feature/amazon-pulse-phase1`**
- **App folder:** `amazon-pulse/`. The rest of the repository is a separate music app (Expo); leave it alone.
- **Backup:** `amazon-pulse-source.zip` holds the same files, if you can't reach GitHub.

## Prompt for the new Claude session

Attach the repository (or upload the zip), then paste:

> I'm continuing setup of Amazon Pulse, a Next.js 16 app in `amazon-pulse/` on branch `feature/amazon-pulse-phase1` of tgopinath/Paadal. Read `amazon-pulse/docs/HANDOFF.md`, `amazon-pulse/README.md` and `amazon-pulse/docs/ARCHITECTURE.md` first. I'm on setup step __ (see HANDOFF.md). Don't ask me to paste secrets into chat; they go into Vercel environment variables.

## What is built (all tested)

| Area | State |
|---|---|
| Dashboard, Explorer, Product detail, Historical Analytics, Trending, Categories, Compare, Opportunity Finder with a GST profit calculator, Watchlist, Reports, Data Sources, Settings, AI page | Done |
| Demo mode (synthetic data, labelled everywhere) | Done; the default when `APP_MODE` isn't set |
| Production mode on PostgreSQL (monthly partitions, daily rollups, demo rows excluded) | Done |
| Email/password accounts (scrypt, database sessions, sign-in throttling) | Done; required in production |
| CSV history import with preview and a run log | Done |
| Watchlist, collections and alerts saved to the account | Done (production, signed in) |
| CSV and Excel exports, print to PDF | Done |
| Daily scheduled job `/api/ingest` (partitions, rollups, alerts, cleanup) | Done; scheduled in `vercel.json` |
| Amazon Pulse AI (Claude Opus 5.5, answers only from analytics tools) | Done; needs `ANTHROPIC_API_KEY`; not yet tried with a real key |
| PA-API / SP-API / Keepa collection adapters | **Waiting**: choose a source and get credentials (step 4) |
| Alert emails | **Not started**: optional (step 5) |

Checks: `npm run lint`, `npm run typecheck`, `npm test` (23 tests), `npm run test:db` (needs a disposable database), `npm run build`.

## Setup steps

**Rule:** never paste passwords, keys or connection strings into a chat. Keep them in a private note, then paste them into Vercel (step 6).

### 1. Database: Neon (free)
1. Sign up at **neon.tech** (signing in with GitHub is fine).
2. Create a project:
   - **Name:** `amazon-pulse`
   - **Postgres version:** the default
   - **Region:** **AWS Asia Pacific (Singapore)**
3. Click **Connect** and copy two strings:
   - **Connection pooling ON:** the host contains `-pooler`. This is **`DATABASE_URL`**.
   - **Connection pooling OFF:** no `-pooler`. This is **`DATABASE_URL_UNPOOLED`**.

   *Shortcut:* skip the copying and, in step 6, connect Neon through Vercel's **Storage / Integrations → Neon**. It sets both variables for you.

### 2. CRON_SECRET
Any long random string. On Mac/Linux, run `openssl rand -hex 32`. Otherwise, generate a password of 40 or more characters.

### 3. Anthropic API key (for the AI page)
1. Sign up at **console.anthropic.com**.
2. Go to **Billing** and add credits ($5 is plenty to start).
3. Under **Limits**, set a monthly spend limit.
4. Go to **API Keys → Create Key** and copy it (it starts with `sk-ant-`). This is **`ANTHROPIC_API_KEY`**.

### 4. Amazon data source (decide)
| Option | Gives | Needs |
|---|---|---|
| A. Selling Partner API | Your own verified sales, plus catalog, rank and price | Seller Central → Apps and Services → Develop Apps (developer registration; can take days to weeks) |
| B. Product Advertising API | Price, rank and catalog | An approved Amazon Associates India account with recent sales; check it's still offered for amazon.in |
| C. Keepa API (licensed) | Long market-wide price and rank history | A paid subscription at keepa.com |
| D. CSV only | Your own exports | Nothing; works today |

After choosing, ask Claude to implement that adapter in `src/lib/providers/index.ts`. It's currently a stub with `implemented: false`, and the scheduled job skips it with a reason.

### 5. Alert emails (optional)
Sign up at **resend.com**, verify a domain you own, then ask Claude to add email delivery to the scheduled job (`src/app/api/ingest/route.ts`).

### 6. Deploy on Vercel
1. Sign up at **vercel.com** with GitHub.
2. Click **Add New → Project** and import **tgopinath/Paadal**. If it isn't listed, use **Adjust GitHub App Permissions**.
3. **Root Directory:** set it to **`amazon-pulse`**. This is required.
4. Add these **Environment Variables**:

   | Name | Value |
   |---|---|
   | `APP_MODE` | `production` |
   | `DATABASE_URL` | pooled string (step 1) |
   | `DATABASE_URL_UNPOOLED` | direct string (step 1) |
   | `CRON_SECRET` | from step 2 |
   | `ANTHROPIC_API_KEY` | from step 3 |
5. **Branch:** Vercel deploys `main`, but the code is on `feature/amazon-pulse-phase1`. Either merge it into `main` with a pull request (recommended: the daily job only runs on production), or set **Settings → Git → Production Branch** to `feature/amazon-pulse-phase1`.
6. **Deploy.** The build creates the database tables automatically through `DATABASE_URL_UNPOOLED`.
7. Open the deployment URL, go to **`/signup`** to create your account, then go to **Data Sources** to import a CSV.

## Things a new session should know

- **Next.js 16 with Cache Components.** Read `amazon-pulse/node_modules/next/dist/docs/` before changing framework code:
  - Request data (`searchParams`, cookies, `new Date()`) must sit inside `<Suspense>`, or come after `await connection()`.
  - Middleware is now `src/proxy.ts`.
  - Only one `next dev` can run per project.
- **Data access:** `getData()` in `src/lib/data/repository.ts` returns the demo dataset or the Postgres dataset. All analytics in `src/lib/analytics/` are pure functions over that dataset.
- **Database:** migrations are plain SQL files in `db/migrations/`, run by `scripts/migrate.mts`, and run automatically at the start of `npm run build`.
- **Tests:** they run with `tsx --conditions=react-server` because server modules import `server-only`.
- **Data rules (non-negotiable):**
  - Never present the demand index as sales.
  - Never fill missing history with current data.
  - Keep demo data labelled and out of production.
