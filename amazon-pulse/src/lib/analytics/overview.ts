import { CATEGORIES, categoryName } from "../categories";
import { addDays, addMonths, eachDay, formatDayShort } from "../dates";
import type { DateRange, Granularity, ISODate } from "../types";
import { mean, pctChange } from "./demand";
import {
  type Dataset,
  type SeriesPoint,
  demandSeries,
  periodStats,
  productSummaries,
  rankProducts,
  sliceRange,
  snapshotAsOf,
  trendScore,
} from "./engine";
import { resolvePeriod } from "./periods";

export interface Kpi {
  key: string;
  label: string;
  value: string;
  /** Product or category the KPI refers to, when it names one. */
  subject?: { label: string; href?: string };
  previousLabel: string;
  previousValue: string;
  changePct: number | null;
  /** For counts: show absolute change instead of %. */
  changeAbs?: number | null;
  spark: (number | null)[];
  help: string;
}

export interface RankRow {
  rank: number;
  asin: string;
  title: string;
  categoryId: string;
  avgDemand: number;
  avgBsr: number | null;
  previousRank: number | null;
}

export interface CategoryRow {
  categoryId: string;
  name: string;
  avgDemand: number | null;
  previousAvgDemand: number | null;
  change: number | null;
  topShare: number; // share of top 50 slots
  products: number;
}

export interface ComparisonBlock {
  key: string;
  label: string;
  currentLabel: string;
  previousLabel: string;
  current: DateRange;
  previous: DateRange;
  avgDemand: number | null;
  prevAvgDemand: number | null;
  avgPrice: number | null;
  prevAvgPrice: number | null;
  risers: number;
  fallers: number;
  byCategory: { name: string; categoryId: string; delta: number | null }[];
  hasPrevious: boolean;
}

const fmt1 = (x: number | null) => (x == null ? "—" : x.toFixed(1));
const fmtINR = (x: number | null) =>
  x == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(x);

function categoryDaily(ds: Dataset, categoryId: string, range: DateRange): (number | null)[] {
  return demandSeries(ds, range, "day", { categoryId }).map((p) => p.value);
}

export function buildKpis(ds: Dataset): Kpi[] {
  const today = ds.today;
  const yesterday = addDays(today, -1);
  const last30: DateRange = { start: addDays(today, -29), end: today };
  const days30 = eachDay(last30.start, last30.end);
  const summaries = productSummaries(ds);

  // 1. Products tracked (with a snapshot today vs 7 days ago)
  const trackedOn = (d: ISODate) => ds.products.filter((p) => sliceRange(ds.snapshots.get(p.id) ?? [], { start: d, end: d }).length > 0).length;
  const trackedSpark = days30.map(trackedOn);
  const trackedNow = trackedSpark.at(-1)!;
  const tracked7 = trackedSpark[trackedSpark.length - 8] ?? null;

  // 2. Most popular product today
  const todayRank = rankProducts(ds, { start: today, end: today });
  const top = todayRank[0];
  const topYesterday = top ? periodStats(top.productId, ds.snapshots.get(top.productId)!, { start: yesterday, end: yesterday }) : null;
  const topSeries = top ? demandSeries(ds, last30, "day", { productIds: [top.productId] }).map((p) => p.value) : [];

  // 3. Highest estimated demand this week
  const week = resolvePeriod({ p: "this_week" }, today);
  const weekRank = rankProducts(ds, week.range);
  const wTop = weekRank[0];
  const wPrev = wTop ? periodStats(wTop.productId, ds.snapshots.get(wTop.productId)!, week.compare.range) : null;
  const wSpark = wTop ? demandSeries(ds, last30, "day", { productIds: [wTop.productId] }).map((p) => p.value) : [];

  // 4. Top category this month
  const month = resolvePeriod({ p: "this_month" }, today);
  const catRows = categoryRows(ds, month.range, month.compare.range);
  const topCat = [...catRows].sort((a, b) => (b.avgDemand ?? -1) - (a.avgDemand ?? -1))[0];

  // 5. Products trending upward (14-day trend), now vs 7 days ago
  const upOn = (d: ISODate) => ds.products.filter((p) => trendScore(ds.snapshots.get(p.id) ?? [], d, 14).direction === "up").length;
  const upSparkDays = days30.filter((_, i) => i % 3 === 2 || i === days30.length - 1);
  const upSpark = upSparkDays.map(upOn);
  const upNow = summaries.filter((s) => s.trend.direction === "up").length;
  const up7 = upOn(addDays(today, -7));

  // 6. Average selling price
  const priceSpark = demandSeries(ds, last30, "day", { metric: "price" }).map((p) => p.value);
  const priceNow = priceSpark.at(-1) ?? null;
  const price7 = priceSpark[priceSpark.length - 8] ?? null;

  return [
    {
      key: "tracked",
      label: "Products tracked",
      value: trackedNow.toLocaleString("en-IN"),
      previousLabel: "7 days ago",
      previousValue: tracked7 == null ? "—" : tracked7.toLocaleString("en-IN"),
      changePct: pctChange(trackedNow, tracked7),
      spark: trackedSpark,
      help: "Products with a snapshot captured today.",
    },
    {
      key: "popular-today",
      label: "Most popular today",
      value: top ? fmt1(top.avgDemand) : "—",
      subject: top ? { label: top.product.title, href: `/products/${top.product.asin}` } : undefined,
      previousLabel: "Yesterday",
      previousValue: fmt1(topYesterday?.avgDemand ?? null),
      changePct: pctChange(top?.avgDemand ?? null, topYesterday?.avgDemand ?? null),
      spark: topSeries,
      help: "Highest estimated demand index (0–100, from BSR) in today's snapshot.",
    },
    {
      key: "demand-week",
      label: "Highest demand this week",
      value: wTop ? fmt1(wTop.avgDemand) : "—",
      subject: wTop ? { label: wTop.product.title, href: `/products/${wTop.product.asin}` } : undefined,
      previousLabel: week.compare.label,
      previousValue: fmt1(wPrev?.avgDemand ?? null),
      changePct: pctChange(wTop?.avgDemand ?? null, wPrev?.avgDemand ?? null),
      spark: wSpark,
      help: "Average demand index this week to date, compared with the same days last week.",
    },
    {
      key: "top-category",
      label: "Top category this month",
      value: topCat ? fmt1(topCat.avgDemand) : "—",
      subject: topCat ? { label: topCat.name, href: `/categories?c=${topCat.categoryId}` } : undefined,
      previousLabel: month.compare.label,
      previousValue: fmt1(topCat?.previousAvgDemand ?? null),
      changePct: pctChange(topCat?.avgDemand ?? null, topCat?.previousAvgDemand ?? null),
      spark: topCat ? categoryDaily(ds, topCat.categoryId, last30) : [],
      help: "Category with the highest average demand index this month to date.",
    },
    {
      key: "trending-up",
      label: "Products trending up",
      value: upNow.toLocaleString("en-IN"),
      previousLabel: "7 days ago",
      previousValue: up7.toLocaleString("en-IN"),
      changePct: pctChange(upNow, up7),
      spark: upSpark,
      help: "Products whose average demand index over the last 14 days is more than 2 points above the 14 days before.",
    },
    {
      key: "avg-price",
      label: "Average selling price",
      value: fmtINR(priceNow),
      previousLabel: "7 days ago",
      previousValue: fmtINR(price7),
      changePct: pctChange(priceNow, price7),
      spark: priceSpark,
      help: "Mean current price across tracked products (GST inclusive, as listed).",
    },
  ];
}

export function categoryRows(ds: Dataset, range: DateRange, compare: DateRange): CategoryRow[] {
  const ranking = rankProducts(ds, range);
  const top50 = ranking.slice(0, 50);
  const prev = rankProducts(ds, compare);
  return CATEGORIES.map((c) => {
    const cur = ranking.filter((r) => r.product.categoryId === c.id);
    const pr = prev.filter((r) => r.product.categoryId === c.id);
    const a = mean(cur.map((r) => r.avgDemand!));
    const b = mean(pr.map((r) => r.avgDemand!));
    return {
      categoryId: c.id,
      name: c.name,
      avgDemand: a == null ? null : Math.round(a * 10) / 10,
      previousAvgDemand: b == null ? null : Math.round(b * 10) / 10,
      change: a != null && b != null ? Math.round((a - b) * 10) / 10 : null,
      topShare: top50.length ? top50.filter((r) => r.product.categoryId === c.id).length / top50.length : 0,
      products: cur.length,
    };
  }).filter((c) => c.products > 0);
}

export function buildRankings(ds: Dataset): Record<"today" | "this_week" | "this_month", { label: string; rows: RankRow[] }> {
  const out = {} as Record<"today" | "this_week" | "this_month", { label: string; rows: RankRow[] }>;
  for (const p of ["today", "this_week", "this_month"] as const) {
    const per = resolvePeriod({ p }, ds.today);
    const prev = new Map(rankProducts(ds, per.compare.range).map((r) => [r.productId, r.rank]));
    out[p] = {
      label: per.label,
      rows: rankProducts(ds, per.range)
        .slice(0, 100)
        .map((r) => ({
          rank: r.rank,
          asin: r.product.asin,
          title: r.product.title,
          categoryId: r.product.categoryId,
          avgDemand: Math.round(r.avgDemand! * 10) / 10,
          avgBsr: r.avgBsr,
          previousRank: prev.get(r.productId) ?? null,
        })),
    };
  }
  return out;
}

export function buildDemandSeries(ds: Dataset): Record<Granularity, SeriesPoint[]> {
  const t = ds.today;
  return {
    day: demandSeries(ds, { start: addDays(t, -29), end: t }, "day"),
    week: demandSeries(ds, { start: addDays(t, -7 * 12 + 1), end: t }, "week").slice(-12),
    month: demandSeries(ds, { start: addMonths(t, -11), end: t }, "month"),
    year: demandSeries(ds, { start: `${Number(t.slice(0, 4)) - 4}-01-01`, end: t }, "year"),
  };
}

export function buildComparisons(ds: Dataset): ComparisonBlock[] {
  const defs = [
    { key: "day", p: "today", label: "Today vs yesterday" },
    { key: "week", p: "this_week", label: "This week vs last week" },
    { key: "month", p: "this_month", label: "This month vs last month" },
    { key: "year", p: "this_year", label: "This year vs last year" },
  ] as const;
  return defs.map((d) => {
    const per = resolvePeriod({ p: d.p }, ds.today);
    const cur = rankProducts(ds, per.range);
    const prev = rankProducts(ds, per.compare.range);
    const prevById = new Map(prev.map((r) => [r.productId, r]));
    let risers = 0;
    let fallers = 0;
    for (const r of cur) {
      const p = prevById.get(r.productId);
      if (!p) continue;
      const delta = r.avgDemand! - p.avgDemand!;
      if (delta > 2) risers++;
      else if (delta < -2) fallers++;
    }
    const cats = categoryRows(ds, per.range, per.compare.range);
    const price = (rs: typeof cur) => mean(rs.map((r) => r.endPrice).filter((x): x is number => x != null));
    return {
      key: d.key,
      label: d.label,
      currentLabel: `${per.label}${per.inProgress && per.kind !== "day" ? " (to date)" : ""}`,
      previousLabel: per.compare.label,
      current: per.range,
      previous: per.compare.range,
      avgDemand: mean(cur.map((r) => r.avgDemand!)),
      prevAvgDemand: mean(prev.map((r) => r.avgDemand!)),
      avgPrice: price(cur),
      prevAvgPrice: price(prev),
      risers,
      fallers,
      byCategory: cats.map((c) => ({ name: c.name, categoryId: c.categoryId, delta: c.change })),
      hasPrevious: prev.length > 0,
    };
  });
}

export function lastNDaysLabels(ds: Dataset, n: number): string[] {
  return eachDay(addDays(ds.today, -(n - 1)), ds.today).map(formatDayShort);
}

export { categoryName, snapshotAsOf };
