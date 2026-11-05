/**
 * Data-backed product performance summary. Each sentence is derived from a
 * metric that is also shown on the page; if the metric is missing, the
 * sentence is omitted rather than guessed. Phase 4 can hand the same facts to
 * an LLM for phrasing, but it must not add facts that aren't in this list.
 */
import { addDays, diffDays } from "../dates";
import type { Snapshot } from "../types";
import { mean, pctChange } from "./demand";
import { type Dataset, type ProductSummary, monthName, seasonality, sliceRange } from "./engine";

export interface Narrative {
  sentences: string[];
  basis: string;
}

export function productNarrative(ds: Dataset, s: ProductSummary): Narrative {
  const series = ds.snapshots.get(s.product.id) ?? [];
  const out: string[] = [];
  const span = series.length ? diffDays(series.at(-1)!.date, series[0].date) + 1 : 0;
  const avg = (xs: Snapshot[], f: (x: Snapshot) => number | null) => mean(xs.map(f).filter((x): x is number => x != null));
  const win = (from: number, to: number) => sliceRange(series, { start: addDays(ds.today, -from), end: addDays(ds.today, -to) });

  if (span < 14) {
    return { sentences: [`Only ${span} day${span === 1 ? "" : "s"} of snapshots exist for this product, which is not enough to describe a trend.`], basis: `${series.length} snapshots` };
  }

  // Consistency over ~3 months
  const q = win(89, 0);
  if (q.length >= 30) {
    const d = q.map((x) => x.demandIndex).filter((x): x is number => x != null);
    const mu = mean(d)!;
    const sd = Math.sqrt(mean(d.map((x) => (x - mu) ** 2))!);
    const level = mu >= 65 ? "very high" : mu >= 50 ? "high" : mu >= 35 ? "moderate" : "low";
    const stable = sd < 4 ? "consistent" : sd < 8 ? "fairly steady" : "volatile";
    out.push(`Over the last ${Math.round(q.length / 30)} months, estimated demand has been ${level} and ${stable} (average index ${mu.toFixed(1)}).`);
  }

  // Rank movement, last 4 weeks vs the 4 before
  const r1 = avg(win(27, 0), (x) => x.bsr);
  const r0 = avg(win(55, 28), (x) => x.bsr);
  if (r1 && r0) {
    const ch = pctChange(r1, r0)!;
    if (Math.abs(ch) < 8) out.push(`Its Best Sellers Rank has held broadly steady over the last four weeks (average #${Math.round(r1).toLocaleString("en-IN")}).`);
    else if (ch < 0)
      out.push(`Its ranking improved over the last four weeks (average BSR #${Math.round(r0).toLocaleString("en-IN")} → #${Math.round(r1).toLocaleString("en-IN")}), suggesting increasing interest.`);
    else out.push(`Its ranking weakened over the last four weeks (average BSR #${Math.round(r0).toLocaleString("en-IN")} → #${Math.round(r1).toLocaleString("en-IN")}).`);
  }

  // Price stability, 60 days
  const p = win(59, 0)
    .map((x) => x.price)
    .filter((x): x is number => x != null);
  if (p.length >= 20) {
    const lo = Math.min(...p);
    const hi = Math.max(...p);
    const range = ((hi - lo) / hi) * 100;
    out.push(
      range < 5
        ? `The price has stayed stable over 60 days (₹${lo.toLocaleString("en-IN")}–₹${hi.toLocaleString("en-IN")}).`
        : `The price moved between ₹${lo.toLocaleString("en-IN")} and ₹${hi.toLocaleString("en-IN")} in the last 60 days (${range.toFixed(0)}% range).`,
    );
  }

  // Reviews
  if (s.reviewsGained30d != null && s.latest?.reviewCount != null) {
    out.push(`It gained ${s.reviewsGained30d.toLocaleString("en-IN")} reviews in 30 days (${s.latest.reviewCount.toLocaleString("en-IN")} total).`);
  }

  // Seasonality, only with ≥ 12 months
  const seas = seasonality(series);
  if (seas.monthsOfData >= 12 && seas.peakMonths.length) {
    out.push(`Snapshot history shows higher demand in ${seas.peakMonths.map(monthName).join(" and ")}.`);
  } else if (seas.monthsOfData < 12) {
    out.push(`Seasonality can't be assessed yet: ${seas.monthsOfData} months of history, 12 needed.`);
  }

  return { sentences: out, basis: `${series.length.toLocaleString("en-IN")} snapshots over ${span} days` };
}
