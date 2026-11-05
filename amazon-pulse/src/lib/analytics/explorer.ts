import { categoryName } from "../categories";
import { addDays } from "../dates";
import type { DemandLevel, TrendDirection } from "../types";
import type { ProductSummary } from "./engine";

export type SortKey = "demand" | "popularity" | "price_drop" | "growth" | "rating" | "competition";

export const SORT_LABELS: Record<SortKey, string> = {
  demand: "Highest estimated demand",
  popularity: "Highest popularity (reviews, 30 days)",
  price_drop: "Biggest price reduction",
  growth: "Fastest growing (trend score)",
  rating: "Best rating",
  competition: "Lowest competition indicator",
};

export interface ExplorerParams {
  q?: string;
  cat?: string;
  sub?: string;
  pmin?: string;
  pmax?: string;
  rmin?: string;
  revmin?: string;
  revmax?: string;
  dmin?: string;
  demand?: string;
  trend?: string;
  updated?: string;
  sort?: string;
  view?: string;
  page?: string;
}

const num = (s?: string) => (s != null && s !== "" && Number.isFinite(Number(s)) ? Number(s) : null);

/** Matches name, ASIN, brand, category and subcategory; all words must match. */
export function matchesQuery(s: ProductSummary, q: string): boolean {
  const hay = `${s.product.title} ${s.product.asin} ${s.product.brand} ${categoryName(s.product.categoryId)} ${s.product.subcategory}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export function filterProducts(all: ProductSummary[], p: ExplorerParams, today: string): ProductSummary[] {
  const pmin = num(p.pmin);
  const pmax = num(p.pmax);
  const rmin = num(p.rmin);
  const revmin = num(p.revmin);
  const revmax = num(p.revmax);
  const dmin = num(p.dmin);
  const updatedDays = num(p.updated);
  const levels = p.demand ? (p.demand.split(",") as DemandLevel[]) : null;
  return all.filter((s) => {
    const price = s.latest?.price ?? null;
    if (p.q && !matchesQuery(s, p.q)) return false;
    if (p.cat && s.product.categoryId !== p.cat) return false;
    if (p.sub && s.product.subcategory !== p.sub) return false;
    if (pmin != null && (price == null || price < pmin)) return false;
    if (pmax != null && (price == null || price > pmax)) return false;
    if (rmin != null && (s.latest?.rating == null || s.latest.rating < rmin)) return false;
    if (revmin != null && (s.latest?.reviewCount == null || s.latest.reviewCount < revmin)) return false;
    if (revmax != null && (s.latest?.reviewCount == null || s.latest.reviewCount > revmax)) return false;
    if (dmin != null && (s.discountPct == null || s.discountPct < dmin)) return false;
    if (levels && (!s.demandLevel || !levels.includes(s.demandLevel))) return false;
    if (p.trend && s.trend.direction !== (p.trend as TrendDirection)) return false;
    if (updatedDays != null && (!s.lastUpdated || s.lastUpdated < addDays(today, -(updatedDays - 1)))) return false;
    return true;
  });
}

export function sortProducts(rows: ProductSummary[], sort: SortKey): ProductSummary[] {
  const v = (x: number | null | undefined, fallback = -Infinity) => (x == null ? fallback : x);
  const priceDrop = (s: ProductSummary) =>
    s.previousPrice && s.latest?.price ? ((s.previousPrice - s.latest.price) / s.previousPrice) * 100 : null;
  const sorted = [...rows];
  switch (sort) {
    case "popularity":
      return sorted.sort((a, b) => v(b.reviewsGained30d) - v(a.reviewsGained30d));
    case "price_drop":
      return sorted.sort((a, b) => v(priceDrop(b)) - v(priceDrop(a)));
    case "growth":
      return sorted.sort((a, b) => v(b.trend.score) - v(a.trend.score));
    case "rating":
      return sorted.sort((a, b) => v(b.latest?.rating) - v(a.latest?.rating) || v(b.latest?.reviewCount) - v(a.latest?.reviewCount));
    case "competition":
      return sorted.sort((a, b) => v(a.competition, Infinity) - v(b.competition, Infinity) || v(b.demand) - v(a.demand));
    default:
      return sorted.sort((a, b) => v(b.demand) - v(a.demand));
  }
}
