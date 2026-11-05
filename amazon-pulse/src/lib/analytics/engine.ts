/**
 * Analytics engine. Pure functions over products and their snapshots.
 * The data source does not matter here: demo, Postgres and CSV all produce
 * the same Dataset shape.
 */
import { CATEGORIES, CATEGORY_ECONOMICS, estimateClosingFee } from "../categories";
import { addDays, diffDays, eachDay, formatDayShort, formatMonthShort, isoWeek, startOfMonth, startOfWeek } from "../dates";
import type { Coverage, DateRange, DemandLevel, Granularity, ISODate, Product, Snapshot, TrendDirection } from "../types";
import { clamp, demandLevel, mean, pctChange, trendDirection } from "./demand";
import { calculateProfit } from "./profit";

export interface Dataset {
  products: Product[];
  snapshots: Map<string, Snapshot[]>; // sorted ascending by date
  today: ISODate;
}

// ---------------------------------------------------------------------------
// Snapshot access
// ---------------------------------------------------------------------------

function lowerBound(series: Snapshot[], date: ISODate): number {
  let lo = 0;
  let hi = series.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].date < date) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function sliceRange(series: Snapshot[], range: DateRange): Snapshot[] {
  return series.slice(lowerBound(series, range.start), lowerBound(series, addDays(range.end, 1)));
}

/** Latest snapshot on or before `date`. */
export function snapshotAsOf(series: Snapshot[], date: ISODate): Snapshot | null {
  const i = lowerBound(series, addDays(date, 1)) - 1;
  return i >= 0 ? series[i] : null;
}

const coveredCache = new WeakMap<Dataset, Set<ISODate>>();
function coveredDates(ds: Dataset): Set<ISODate> {
  let set = coveredCache.get(ds);
  if (!set) {
    set = new Set();
    for (const s of ds.snapshots.values()) for (const snap of s) set.add(snap.date);
    coveredCache.set(ds, set);
  }
  return set;
}

export function dataBounds(ds: Dataset): { first: ISODate | null; last: ISODate | null } {
  const dates = [...coveredDates(ds)].sort();
  return { first: dates[0] ?? null, last: dates.at(-1) ?? null };
}

export function coverage(ds: Dataset, range: DateRange): Coverage {
  const days = eachDay(range.start, range.end);
  const set = coveredDates(ds);
  const covered = days.filter((d) => set.has(d));
  return {
    totalDays: days.length,
    coveredDays: covered.length,
    status: covered.length === 0 ? "none" : covered.length === days.length ? "full" : "partial",
    firstCovered: covered[0] ?? null,
    lastCovered: covered.at(-1) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Per-product period statistics
// ---------------------------------------------------------------------------

export interface PeriodStats {
  productId: string;
  observations: number;
  avgDemand: number | null;
  avgBsr: number | null;
  bestBsr: number | null;
  startPrice: number | null;
  endPrice: number | null;
  priceChangePct: number | null;
  reviewsGained: number | null;
  endRating: number | null;
}

export function periodStats(productId: string, series: Snapshot[], range: DateRange): PeriodStats {
  const s = sliceRange(series, range);
  const demand = s.map((x) => x.demandIndex).filter((x): x is number => x != null);
  const bsr = s.map((x) => x.bsr).filter((x): x is number => x != null);
  const prices = s.map((x) => x.price).filter((x): x is number => x != null);
  const firstReviews = s.find((x) => x.reviewCount != null)?.reviewCount ?? null;
  const lastReviews = [...s].reverse().find((x) => x.reviewCount != null)?.reviewCount ?? null;
  return {
    productId,
    observations: s.length,
    avgDemand: mean(demand),
    avgBsr: bsr.length ? Math.round(mean(bsr)!) : null,
    bestBsr: bsr.length ? Math.min(...bsr) : null,
    startPrice: prices[0] ?? null,
    endPrice: prices.at(-1) ?? null,
    priceChangePct: pctChange(prices.at(-1) ?? null, prices[0] ?? null),
    reviewsGained: firstReviews != null && lastReviews != null ? lastReviews - firstReviews : null,
    endRating: [...s].reverse().find((x) => x.rating != null)?.rating ?? null,
  };
}

export interface RankedProduct extends PeriodStats {
  rank: number;
  product: Product;
}

export function rankProducts(ds: Dataset, range: DateRange, opts: { categoryId?: string } = {}): RankedProduct[] {
  const rows: Omit<RankedProduct, "rank">[] = [];
  for (const p of ds.products) {
    if (opts.categoryId && p.categoryId !== opts.categoryId) continue;
    const st = periodStats(p.id, ds.snapshots.get(p.id) ?? [], range);
    if (st.observations === 0 || st.avgDemand == null) continue;
    rows.push({ ...st, product: p });
  }
  rows.sort((a, b) => b.avgDemand! - a.avgDemand! || (a.avgBsr ?? Infinity) - (b.avgBsr ?? Infinity));
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ---------------------------------------------------------------------------
// Period report (historical analytics)
// ---------------------------------------------------------------------------

export interface CategoryShare {
  categoryId: string;
  name: string;
  products: number;
  avgDemand: number | null;
  share: number; // share of top-N slots, 0–1
}

export interface RankMover {
  product: Product;
  rank: number | null;
  previousRank: number | null;
  avgDemand: number | null;
}

export interface PeriodReport {
  range: DateRange;
  compareRange: DateRange;
  coverage: Coverage;
  compareCoverage: Coverage;
  ranking: RankedProduct[];
  previousRanking: RankedProduct[];
  categoryDistribution: CategoryShare[];
  entering: RankMover[];
  leaving: RankMover[];
  avgDemand: number | null;
  previousAvgDemand: number | null;
  avgPrice: number | null;
  previousAvgPrice: number | null;
  /** Products whose period-average price moved most. */
  priceMovers: { product: Product; from: number; to: number; pct: number }[];
}

export function periodReport(ds: Dataset, range: DateRange, compareRange: DateRange, topN = 50): PeriodReport {
  const cov = coverage(ds, range);
  const ccov = coverage(ds, compareRange);
  const ranking = cov.status === "none" ? [] : rankProducts(ds, range);
  const previousRanking = ccov.status === "none" ? [] : rankProducts(ds, compareRange);
  const top = ranking.slice(0, topN);

  const prevRankById = new Map(previousRanking.map((r) => [r.productId, r.rank]));
  const curRankById = new Map(ranking.map((r) => [r.productId, r.rank]));

  const entering: RankMover[] =
    previousRanking.length === 0
      ? []
      : top
          .filter((r) => (prevRankById.get(r.productId) ?? Infinity) > topN)
          .map((r) => ({ product: r.product, rank: r.rank, previousRank: prevRankById.get(r.productId) ?? null, avgDemand: r.avgDemand }));
  const leaving: RankMover[] =
    ranking.length === 0
      ? []
      : previousRanking
          .slice(0, topN)
          .filter((r) => (curRankById.get(r.productId) ?? Infinity) > topN)
          .map((r) => ({ product: r.product, rank: curRankById.get(r.productId) ?? null, previousRank: r.rank, avgDemand: r.avgDemand }));

  const categoryDistribution: CategoryShare[] = CATEGORIES.map((c) => {
    const inTop = top.filter((r) => r.product.categoryId === c.id);
    return {
      categoryId: c.id,
      name: c.name,
      products: inTop.length,
      avgDemand: mean(inTop.map((r) => r.avgDemand!)),
      share: top.length ? inTop.length / top.length : 0,
    };
  }).filter((c) => c.products > 0);
  categoryDistribution.sort((a, b) => b.products - a.products);

  const priceMovers = ranking
    .filter((r) => r.startPrice != null && r.endPrice != null && r.priceChangePct != null && Math.abs(r.priceChangePct) >= 1)
    .map((r) => ({ product: r.product, from: r.startPrice!, to: r.endPrice!, pct: r.priceChangePct! }))
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
    .slice(0, 8);

  const avgPrice = (rs: RankedProduct[]) => mean(rs.map((r) => r.endPrice).filter((x): x is number => x != null));

  return {
    range,
    compareRange,
    coverage: cov,
    compareCoverage: ccov,
    ranking,
    previousRanking,
    categoryDistribution,
    entering,
    leaving,
    avgDemand: mean(ranking.map((r) => r.avgDemand!)),
    previousAvgDemand: mean(previousRanking.map((r) => r.avgDemand!)),
    avgPrice: avgPrice(ranking),
    previousAvgPrice: avgPrice(previousRanking),
    priceMovers,
  };
}

// ---------------------------------------------------------------------------
// Time series
// ---------------------------------------------------------------------------

export interface SeriesPoint {
  key: string;
  label: string;
  value: number | null;
  /** Days with data in this bucket. */
  covered: number;
  days: number;
}

function bucketKey(date: ISODate, g: Granularity): { key: string; label: string } {
  switch (g) {
    case "day":
      return { key: date, label: formatDayShort(date) };
    case "week": {
      const s = startOfWeek(date);
      const { week } = isoWeek(s);
      return { key: s, label: `W${week} · ${formatDayShort(s)}` };
    }
    case "month": {
      const s = startOfMonth(date);
      return { key: s, label: formatMonthShort(s) };
    }
    case "year":
      return { key: date.slice(0, 4), label: date.slice(0, 4) };
  }
}

/**
 * Average demand index per bucket. With `productIds`, only those products;
 * otherwise all products. Buckets without data have value null (a gap, not 0).
 */
export function demandSeries(
  ds: Dataset,
  range: DateRange,
  g: Granularity,
  opts: { productIds?: string[]; categoryId?: string; metric?: "demand" | "price" | "bsr" | "reviews" } = {},
): SeriesPoint[] {
  const metric = opts.metric ?? "demand";
  const products = ds.products.filter(
    (p) => (!opts.productIds || opts.productIds.includes(p.id)) && (!opts.categoryId || p.categoryId === opts.categoryId),
  );
  const byDay = new Map<ISODate, number[]>();
  for (const p of products) {
    for (const s of sliceRange(ds.snapshots.get(p.id) ?? [], range)) {
      const v = metric === "demand" ? s.demandIndex : metric === "price" ? s.price : metric === "bsr" ? s.bsr : s.reviewCount;
      if (v == null) continue;
      const arr = byDay.get(s.date) ?? [];
      arr.push(v);
      byDay.set(s.date, arr);
    }
  }
  const buckets = new Map<string, { label: string; daily: number[]; days: number }>();
  for (const d of eachDay(range.start, range.end)) {
    const { key, label } = bucketKey(d, g);
    const b = buckets.get(key) ?? { label, daily: [], days: 0 };
    b.days++;
    const vals = byDay.get(d);
    if (vals?.length) b.daily.push(mean(vals)!);
    buckets.set(key, b);
  }
  return [...buckets.entries()].map(([key, b]) => {
    const v = mean(b.daily);
    return { key, label: b.label, value: v == null ? null : Math.round(v * 10) / 10, covered: b.daily.length, days: b.days };
  });
}

// ---------------------------------------------------------------------------
// Trend score
// ---------------------------------------------------------------------------

export interface ScoreComponent {
  key: string;
  label: string;
  weight: number; // 0–1
  score: number; // 0–100
  detail: string;
}

export interface TrendScore {
  score: number | null;
  direction: TrendDirection;
  components: ScoreComponent[];
  insufficient?: string;
  demandDelta: number | null;
}

export function trendScore(series: Snapshot[], asOf: ISODate, windowDays = 14): TrendScore {
  const recent = sliceRange(series, { start: addDays(asOf, -(windowDays - 1)), end: asOf });
  const prior = sliceRange(series, { start: addDays(asOf, -(2 * windowDays - 1)), end: addDays(asOf, -windowDays) });
  const minObs = Math.max(1, Math.floor(windowDays / 3));
  if (recent.length < minObs || prior.length < minObs) {
    return {
      score: null,
      direction: "flat",
      components: [],
      demandDelta: null,
      insufficient: `Needs at least ${minObs} days of snapshots in each ${windowDays}-day window (has ${recent.length} and ${prior.length}).`,
    };
  }
  const avg = (s: Snapshot[], f: (x: Snapshot) => number | null) => mean(s.map(f).filter((x): x is number => x != null));

  const rBsr = avg(recent, (x) => x.bsr);
  const pBsr = avg(prior, (x) => x.bsr);
  const bsrLog = rBsr && pBsr ? Math.log10(pBsr / rBsr) : 0;
  const bsrScore = clamp(50 + bsrLog * 110);

  const rD = avg(recent, (x) => x.demandIndex);
  const pD = avg(prior, (x) => x.demandIndex);
  const dDelta = rD != null && pD != null ? rD - pD : 0;
  const demandScore = clamp(50 + dDelta * 4);

  const gained = (s: Snapshot[]) => {
    const r = s.map((x) => x.reviewCount).filter((x): x is number => x != null);
    return r.length >= 2 ? r.at(-1)! - r[0] : 0;
  };
  const rRev = gained(recent);
  const pRev = gained(prior);
  const revRatio = (rRev + 1) / (pRev + 1);
  const reviewScore = clamp(50 + Math.log2(revRatio) * 35);

  const rP = avg(recent, (x) => x.price);
  const pP = avg(prior, (x) => x.price);
  const priceChange = pctChange(rP, pP) ?? 0;
  const priceScore = clamp(50 - priceChange * 2.5);

  const components: ScoreComponent[] = [
    {
      key: "bsr",
      label: "BSR movement",
      weight: 0.4,
      score: Math.round(bsrScore),
      detail: rBsr && pBsr ? `Avg BSR ${Math.round(pBsr).toLocaleString("en-IN")} → ${Math.round(rBsr).toLocaleString("en-IN")}` : "No BSR data",
    },
    {
      key: "demand",
      label: "Demand change",
      weight: 0.25,
      score: Math.round(demandScore),
      detail: `Demand index ${dDelta >= 0 ? "+" : ""}${dDelta.toFixed(1)} pts`,
    },
    {
      key: "reviews",
      label: "Review growth",
      weight: 0.2,
      score: Math.round(reviewScore),
      detail: `${rRev.toLocaleString("en-IN")} new reviews vs ${pRev.toLocaleString("en-IN")} in prior ${windowDays} days`,
    },
    {
      key: "price",
      label: "Price movement",
      weight: 0.15,
      score: Math.round(priceScore),
      detail: `Avg price ${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(1)}%`,
    },
  ];
  const score = Math.round(components.reduce((a, c) => a + c.weight * c.score, 0));
  return { score, direction: trendDirection(dDelta), components, demandDelta: Math.round(dDelta * 10) / 10 };
}

// ---------------------------------------------------------------------------
// Seasonality
// ---------------------------------------------------------------------------

export interface Seasonality {
  /** Average demand by calendar month (1–12), only months with data. */
  monthly: { month: number; avgDemand: number; observations: number }[];
  peakMonths: number[];
  /** Coefficient of variation of the monthly averages (0 = flat). */
  variation: number | null;
  monthsOfData: number;
}

export function seasonality(series: Snapshot[]): Seasonality {
  const byMonth = new Map<number, number[]>();
  const monthsSeen = new Set<string>();
  for (const s of series) {
    if (s.demandIndex == null) continue;
    const m = Number(s.date.slice(5, 7));
    monthsSeen.add(s.date.slice(0, 7));
    const a = byMonth.get(m) ?? [];
    a.push(s.demandIndex);
    byMonth.set(m, a);
  }
  const monthly = [...byMonth.entries()]
    .map(([month, xs]) => ({ month, avgDemand: Math.round(mean(xs)! * 10) / 10, observations: xs.length }))
    .sort((a, b) => a.month - b.month);
  if (monthly.length < 6) return { monthly, peakMonths: [], variation: null, monthsOfData: monthsSeen.size };
  const avgs = monthly.map((m) => m.avgDemand);
  const mu = mean(avgs)!;
  const sd = Math.sqrt(mean(avgs.map((x) => (x - mu) ** 2))!);
  const peakMonths = monthly.filter((m) => m.avgDemand >= mu + sd).map((m) => m.month);
  return { monthly, peakMonths, variation: mu ? sd / mu : null, monthsOfData: monthsSeen.size };
}

// ---------------------------------------------------------------------------
// Product summary (used by explorer, cards, watchlist, comparison)
// ---------------------------------------------------------------------------

export interface ProductSummary {
  product: Product;
  latest: Snapshot | null;
  /** Date of the latest snapshot. */
  lastUpdated: ISODate | null;
  /** Price 30 days ago, when a snapshot exists then. */
  previousPrice: number | null;
  discountPct: number | null;
  demand: number | null;
  demandLevel: DemandLevel | null;
  /** Change in rank vs 7 days ago (positive = moved up). */
  rankChange7d: number | null;
  demandDelta7d: number | null;
  trend: TrendScore;
  sparkline: (number | null)[];
  reviewsGained30d: number | null;
  /** Higher = more crowded / entrenched. 0–100. */
  competition: number | null;
}

const summaryCache = new WeakMap<Dataset, Map<string, ProductSummary>>();

export function productSummaries(ds: Dataset): ProductSummary[] {
  let cache = summaryCache.get(ds);
  if (!cache) {
    cache = new Map();
    for (const p of ds.products) cache.set(p.id, buildSummary(ds, p));
    summaryCache.set(ds, cache);
  }
  return [...cache.values()];
}

export function productSummary(ds: Dataset, productId: string): ProductSummary | null {
  productSummaries(ds);
  return summaryCache.get(ds)!.get(productId) ?? null;
}

function buildSummary(ds: Dataset, p: Product): ProductSummary {
  const series = ds.snapshots.get(p.id) ?? [];
  const latest = series.at(-1) ?? null;
  const asOf = latest?.date ?? ds.today;
  const prev30 = snapshotAsOf(series, addDays(asOf, -30));
  const prev7 = snapshotAsOf(series, addDays(asOf, -7));
  const prevPrice = prev30 && prev30.date >= addDays(asOf, -35) ? prev30.price : null;
  const discountPct = latest?.price && latest.listPrice && latest.listPrice > latest.price ? ((latest.listPrice - latest.price) / latest.listPrice) * 100 : null;
  const last30 = eachDay(addDays(ds.today, -29), ds.today);
  const byDate = new Map(sliceRange(series, { start: last30[0], end: ds.today }).map((s) => [s.date, s.demandIndex]));
  const rev30 = prev30?.reviewCount != null && latest?.reviewCount != null ? latest.reviewCount - prev30.reviewCount : null;
  const reviews = latest?.reviewCount ?? null;
  return {
    product: p,
    latest,
    lastUpdated: latest?.date ?? null,
    previousPrice: prevPrice ?? null,
    discountPct: discountPct == null ? null : Math.round(discountPct),
    demand: latest?.demandIndex ?? null,
    demandLevel: demandLevel(latest?.demandIndex ?? null),
    rankChange7d: latest?.bsr != null && prev7?.bsr != null ? prev7.bsr - latest.bsr : null,
    demandDelta7d: latest?.demandIndex != null && prev7?.demandIndex != null ? Math.round((latest.demandIndex - prev7.demandIndex) * 10) / 10 : null,
    trend: trendScore(series, asOf, 14),
    sparkline: last30.map((d) => byDate.get(d) ?? null),
    reviewsGained30d: rev30,
    competition: reviews == null ? null : Math.round(clamp(((Math.log10(reviews + 1) - 1.5) / 3) * 100)),
  };
}

// ---------------------------------------------------------------------------
// Opportunity score
// ---------------------------------------------------------------------------

export type OpportunityClass = "high" | "medium" | "low";

export interface Opportunity {
  summary: ProductSummary;
  score: number | null;
  classification: OpportunityClass | null;
  factors: ScoreComponent[];
  estimatedMarginPct: number | null;
  explanation: string;
  insufficient?: string;
}

export function opportunity(ds: Dataset, s: ProductSummary): Opportunity {
  const series = ds.snapshots.get(s.product.id) ?? [];
  const recent = sliceRange(series, { start: addDays(ds.today, -29), end: ds.today });
  if (recent.length < 10 || s.latest?.price == null) {
    return {
      summary: s,
      score: null,
      classification: null,
      factors: [],
      estimatedMarginPct: null,
      explanation: "",
      insufficient: `Only ${recent.length} days of snapshots in the last 30 days; at least 10 are needed.`,
    };
  }
  const econ = CATEGORY_ECONOMICS[s.product.categoryId] ?? CATEGORY_ECONOMICS.other;
  const price = s.latest.price;
  const demand30 = mean(recent.map((x) => x.demandIndex).filter((x): x is number => x != null)) ?? 0;

  const profit = calculateProfit({
    sellingPrice: price,
    productGstPct: econ.gstRatePct,
    purchaseCost: price * econ.typicalCostRatio,
    purchaseGstPct: econ.gstRatePct,
    shipping: price < 500 ? 45 : price < 1500 ? 70 : 110,
    packaging: 15,
    other: price * 0.03,
    referralFeePct: econ.referralFeePct,
    closingFee: estimateClosingFee(price),
    claimsItc: true,
  });
  const margin = profit.marginPct ?? 0;
  const seas = seasonality(series);
  const rating = s.latest.rating;

  const priceBandScore = price >= 300 && price <= 2500 ? 100 : price < 300 ? clamp(30 + (price / 300) * 70) : clamp(100 - ((price - 2500) / 7500) * 80);
  const factors: ScoreComponent[] = [
    { key: "demand", label: "Estimated demand", weight: 0.25, score: Math.round(clamp(demand30 * 1.35)), detail: `30-day avg demand index ${demand30.toFixed(1)}` },
    {
      key: "competition",
      label: "Competition",
      weight: 0.2,
      score: Math.round(100 - (s.competition ?? 50)),
      detail: `${(s.latest.reviewCount ?? 0).toLocaleString("en-IN")} reviews on this listing (fewer = easier to compete)`,
    },
    { key: "margin", label: "Margin potential", weight: 0.2, score: Math.round(clamp((margin / 30) * 100)), detail: `Est. net margin ${margin.toFixed(1)}% at a typical ${Math.round(econ.typicalCostRatio * 100)}% cost ratio` },
    { key: "price", label: "Price band", weight: 0.1, score: Math.round(priceBandScore), detail: `₹${price.toLocaleString("en-IN")} (₹300–₹2,500 is easiest to launch in)` },
    { key: "returns", label: "Return risk", weight: 0.1, score: econ.returnRisk === "low" ? 90 : econ.returnRisk === "medium" ? 60 : 30, detail: `${econ.returnRisk[0].toUpperCase()}${econ.returnRisk.slice(1)} return risk for this category` },
    {
      key: "seasonality",
      label: "Demand stability",
      weight: 0.05,
      score: seas.variation == null ? 50 : Math.round(clamp(100 - seas.variation * 300)),
      detail: seas.variation == null ? `Only ${seas.monthsOfData} months of data — neutral score` : seas.peakMonths.length ? `Seasonal: peaks in ${seas.peakMonths.map(monthName).join(", ")}` : "Demand fairly steady across months",
    },
    {
      key: "rating",
      label: "Rating gap",
      weight: 0.1,
      score: rating == null ? 50 : Math.round(clamp(((4.7 - rating) / 1.2) * 100)),
      detail: rating == null ? "No rating yet" : `Rated ${rating.toFixed(1)}★ — ${rating < 4.2 ? "room for a better product" : "customers are already well served"}`,
    },
  ];
  const score = Math.round(factors.reduce((a, f) => a + f.weight * f.score, 0));
  const classification: OpportunityClass = score >= 70 ? "high" : score >= 55 ? "medium" : "low";
  const sorted = [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight);
  const strengths = sorted.slice(0, 2).map((f) => f.label.toLowerCase());
  const weakest = [...factors].sort((a, b) => a.score - b.score)[0];
  const explanation = `Strongest signals: ${strengths.join(" and ")}. Main risk: ${weakest.label.toLowerCase()} (${weakest.detail.charAt(0).toLowerCase()}${weakest.detail.slice(1)}).`;
  return { summary: s, score, classification, factors, estimatedMarginPct: profit.marginPct, explanation };
}

export function monthName(m: number): string {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1];
}

// ---------------------------------------------------------------------------
// Consistency & daily ranks
// ---------------------------------------------------------------------------

/** Share of covered days in `range` each product spent in the daily top N. */
export function topNConsistency(ds: Dataset, range: DateRange, n = 25): Map<string, { days: number; covered: number }> {
  const daily = new Map<ISODate, { id: string; d: number }[]>();
  for (const p of ds.products) {
    for (const s of sliceRange(ds.snapshots.get(p.id) ?? [], range)) {
      if (s.demandIndex == null) continue;
      const a = daily.get(s.date) ?? [];
      a.push({ id: p.id, d: s.demandIndex });
      daily.set(s.date, a);
    }
  }
  const out = new Map<string, { days: number; covered: number }>();
  for (const p of ds.products) out.set(p.id, { days: 0, covered: daily.size });
  for (const rows of daily.values()) {
    rows.sort((a, b) => b.d - a.d);
    for (const r of rows.slice(0, n)) out.get(r.id)!.days++;
  }
  return out;
}

export function daysBetween(range: DateRange): number {
  return diffDays(range.end, range.start) + 1;
}
