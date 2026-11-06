import { timingSafeEqual } from "node:crypto";
import { db, hasDatabase } from "@/lib/db";
import { ingest } from "@/lib/data/ingest";
import { PROVIDERS, providerStatus } from "@/lib/providers";
import { todayIST } from "@/lib/dates";
import { getData } from "@/lib/data/repository";
import { productSummaries } from "@/lib/analytics/engine";

/**
 * Scheduled collection and maintenance. Called daily by the platform's cron
 * (vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 *
 * 1. Make sure next month's snapshot partition exists.
 * 2. Run every configured, implemented provider for the tracked ASINs.
 * 3. Refresh the daily rollup view.
 * 4. Evaluate enabled alerts and record when they trigger.
 * 5. Remove expired sessions and old sign-in attempts.
 */
export const maxDuration = 300;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) return Response.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (!authorised(request)) return Response.json({ error: "Unauthorised" }, { status: 401 });
  if (!hasDatabase()) return Response.json({ error: "DATABASE_URL is not set" }, { status: 503 });

  const sql = db();
  const today = todayIST();
  const report: Record<string, unknown> = { date: today };

  await sql`SELECT ensure_snapshot_partition((date_trunc('month', now()) + interval '1 month')::date)`;

  const asins = (await sql<{ asin: string }[]>`SELECT asin FROM products ORDER BY asin`).map((r) => r.asin);
  const providers: Record<string, string> = {};
  for (const p of PROVIDERS.filter((x) => x.id !== "csv")) {
    const st = providerStatus(p);
    if (!st.configured) {
      providers[p.id] = "skipped: credentials not set";
      continue;
    }
    if (!p.implemented) {
      providers[p.id] = "skipped: adapter not implemented yet";
      continue;
    }
    if (!asins.length) {
      providers[p.id] = "skipped: no tracked products";
      continue;
    }
    try {
      const batch = await p.collect(asins, today);
      const res = await ingest(
        sql,
        p.id,
        batch.snapshots.map((s) => {
          const meta = batch.products.find((x) => x.asin === s.asin);
          return { asin: s.asin, date: s.date, title: meta?.title, brand: meta?.brand, categoryId: meta?.categoryId, subcategory: meta?.subcategory, imageUrl: meta?.imageUrl, amazonUrl: meta?.amazonUrl, price: s.price, listPrice: s.listPrice, rating: s.rating, reviewCount: s.reviewCount, bsr: s.bsr };
        }),
        "scheduled collection",
      );
      providers[p.id] = `ok: ${res.rowsWritten} rows`;
    } catch (e) {
      providers[p.id] = `failed: ${(e as Error).message}`;
    }
  }
  report.providers = providers;

  await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY daily_product_rollups`;

  // Alerts, evaluated on production data only.
  if (process.env.APP_MODE === "production") {
    const { ds } = await getData();
    const byAsin = new Map(productSummaries(ds).map((s) => [s.product.asin, s]));
    const alerts = await sql<{ id: string; asin: string; type: string; threshold: number }[]>`
      SELECT a.id, p.asin, a.alert_type::text AS type, a.threshold FROM alerts a JOIN products p ON p.id = a.product_id WHERE a.enabled`;
    const fired: string[] = [];
    for (const a of alerts) {
      const s = byAsin.get(a.asin);
      if (!s) continue;
      const hit =
        a.type === "price_below" ? s.latest?.price != null && s.latest.price < a.threshold
        : a.type === "rank_better_than" ? s.latest?.bsr != null && s.latest.bsr < a.threshold
        : a.type === "trend_score_above" ? s.trend.score != null && s.trend.score > a.threshold
        : s.demandDelta7d != null && Math.abs(s.demandDelta7d) > a.threshold;
      if (hit) fired.push(a.id);
    }
    if (fired.length) await sql`UPDATE alerts SET last_triggered_at = now() WHERE id = ANY(${fired}::uuid[])`;
    report.alertsTriggered = fired.length;
  }

  const expired = await sql`DELETE FROM sessions WHERE expires_at < now()`;
  const attempts = await sql`DELETE FROM login_attempts WHERE created_at < now() - interval '1 day'`;
  report.cleanup = { sessions: expired.count, loginAttempts: attempts.count };

  return Response.json(report);
}
