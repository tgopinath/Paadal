import { addDays } from "../dates";
import type { Product } from "../types";
import { type Dataset, type ProductSummary, type TrendScore, monthName, productSummaries, seasonality, topNConsistency, trendScore } from "./engine";

export type Lens = "today" | "week" | "month" | "fastest" | "seasonal" | "new" | "consistent";

export const LENSES: { key: Lens; label: string; description: string }[] = [
  { key: "today", label: "Trending today", description: "Today's snapshot vs the 3 days before it." },
  { key: "week", label: "This week", description: "Last 7 days vs the 7 days before." },
  { key: "month", label: "This month", description: "Last 30 days vs the 30 days before." },
  { key: "fastest", label: "Fastest growing", description: "Largest BSR improvement over 30 days." },
  { key: "seasonal", label: "Seasonal opportunities", description: "Products whose demand peaked in the coming 6 weeks last year, based on last year's snapshots." },
  { key: "new", label: "Newly popular", description: "First tracked within the last 120 days and already at high demand." },
  { key: "consistent", label: "Consistently popular", description: "In the daily top 25 on most days of the last 180 days." },
];

export interface TrendRow {
  summary: ProductSummary;
  trend: TrendScore;
  /** Lens-specific evidence, shown next to the score. */
  evidence: string;
  sortValue: number;
}

function windowFor(lens: Lens): number {
  return lens === "today" ? 3 : lens === "week" ? 7 : 30;
}

export function trendingRows(ds: Dataset, lens: Lens): { rows: TrendRow[]; note?: string } {
  const sums = productSummaries(ds);
  const series = (p: Product) => ds.snapshots.get(p.id) ?? [];

  if (lens === "today" || lens === "week" || lens === "month") {
    const w = windowFor(lens);
    const rows = sums
      .map((s) => ({ s, t: trendScore(series(s.product), ds.today, w) }))
      .filter((x) => x.t.score != null && x.t.direction === "up")
      .map((x) => ({
        summary: x.s,
        trend: x.t,
        evidence: `Demand index +${x.t.demandDelta?.toFixed(1)} pts`,
        sortValue: x.t.score!,
      }))
      .sort((a, b) => b.sortValue - a.sortValue);
    return { rows };
  }

  if (lens === "fastest") {
    const rows = sums
      .map((s) => {
        const ser = series(s.product);
        const now = ser.at(-1);
        const then = ser.find((x) => x.date >= addDays(ds.today, -30));
        const gain = now?.bsr && then?.bsr ? Math.log10(then.bsr / now.bsr) : null;
        return { s, gain, now, then };
      })
      .filter((x) => x.gain != null && x.gain > 0.05)
      .map((x) => ({
        summary: x.s,
        trend: x.s.trend,
        evidence: `BSR #${x.then!.bsr!.toLocaleString("en-IN")} → #${x.now!.bsr!.toLocaleString("en-IN")} in 30 days`,
        sortValue: x.gain!,
      }))
      .sort((a, b) => b.sortValue - a.sortValue);
    return { rows };
  }

  if (lens === "seasonal") {
    // Same weekday 52 weeks ago: the coming 6 weeks last year vs the 6 weeks before.
    const lastYearStart = addDays(ds.today, -364);
    const upcoming = { start: lastYearStart, end: addDays(lastYearStart, 42) };
    const before = { start: addDays(lastYearStart, -42), end: addDays(lastYearStart, -1) };
    const rows: TrendRow[] = [];
    let anyHistory = false;
    for (const s of sums) {
      const ser = series(s.product);
      const avg = (r: { start: string; end: string }) => {
        const v = ser.filter((x) => x.date >= r.start && x.date <= r.end && x.demandIndex != null).map((x) => x.demandIndex!);
        return v.length >= 14 ? v.reduce((a, b) => a + b, 0) / v.length : null;
      };
      const a = avg(upcoming);
      const b = avg(before);
      if (a != null && b != null) anyHistory = true;
      if (a == null || b == null || a - b < 4) continue;
      const seas = seasonality(ser);
      rows.push({
        summary: s,
        trend: s.trend,
        evidence: `Last year: demand +${(a - b).toFixed(1)} pts in this window${seas.peakMonths.length ? ` · peaks ${seas.peakMonths.map(monthName).join(", ")}` : ""}`,
        sortValue: a - b,
      });
    }
    rows.sort((x, y) => y.sortValue - x.sortValue);
    return {
      rows,
      note: anyHistory ? undefined : "Seasonal signals need snapshots from the same weeks last year. Historical data not available for that window yet.",
    };
  }

  if (lens === "new") {
    const cutoff = addDays(ds.today, -120);
    const rows = sums
      .filter((s) => s.product.firstSeen >= cutoff && (s.demand ?? 0) >= 45)
      .map((s) => ({ summary: s, trend: s.trend, evidence: `First tracked ${s.product.firstSeen} · demand ${s.demand?.toFixed(1)}`, sortValue: s.demand ?? 0 }))
      .sort((a, b) => b.sortValue - a.sortValue);
    return { rows };
  }

  // consistent
  const range = { start: addDays(ds.today, -179), end: ds.today };
  const cons = topNConsistency(ds, range, 25);
  const rows = sums
    .map((s) => ({ s, c: cons.get(s.product.id)! }))
    .filter((x) => x.c.covered > 0 && x.c.days / x.c.covered >= 0.6)
    .map((x) => ({
      summary: x.s,
      trend: x.s.trend,
      evidence: `In the daily top 25 on ${x.c.days} of ${x.c.covered} days (${Math.round((x.c.days / x.c.covered) * 100)}%)`,
      sortValue: x.c.days / x.c.covered,
    }))
    .sort((a, b) => b.sortValue - a.sortValue);
  return { rows };
}
