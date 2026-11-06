/**
 * Core domain types. These mirror the PostgreSQL schema (prisma/schema.prisma)
 * so the analytics engine works the same on demo data and on real data.
 */

/** ISO calendar date, YYYY-MM-DD, in Asia/Kolkata. */
export type ISODate = string;

export type DataSourceKind =
  | "demo" // synthetic, never shown in production
  | "pa_api" // Amazon Product Advertising API 5.0
  | "sp_api" // Amazon Selling Partner API (your own seller account)
  | "licensed" // licensed third-party research provider
  | "csv"; // user-uploaded historical file

export type TrendDirection = "up" | "down" | "flat";
export type DemandLevel = "very_high" | "high" | "medium" | "low";

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

export interface Product {
  id: string;
  asin: string;
  title: string;
  brand: string;
  categoryId: string;
  subcategory: string;
  imageUrl: string | null;
  /** null for demo products: there is no real listing to link to. */
  amazonUrl: string | null;
  firstSeen: ISODate;
}

/**
 * One observation of a product on a given day. Fields are nullable because
 * not every source returns every field (e.g. PA-API does not return BSR for
 * all listings). Never fill a null with a guess.
 */
export interface Snapshot {
  date: ISODate;
  price: number | null;
  /** Strike-through / list price, when the source provides it. */
  listPrice: number | null;
  rating: number | null;
  reviewCount: number | null;
  bsr: number | null;
  /** Estimated demand index 0–100 derived from BSR. Relative, not units. */
  demandIndex: number | null;
  source: DataSourceKind;
}

export interface DateRange {
  start: ISODate;
  end: ISODate;
}

export type Granularity = "day" | "week" | "month" | "year";

export interface Coverage {
  /** Days in the requested range. */
  totalDays: number;
  /** Days that have at least one snapshot. */
  coveredDays: number;
  status: "full" | "partial" | "none";
  firstCovered: ISODate | null;
  lastCovered: ISODate | null;
}
