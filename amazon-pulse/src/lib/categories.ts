import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  { id: "electronics", name: "Electronics", parentId: null },
  { id: "home-kitchen", name: "Home & Kitchen", parentId: null },
  { id: "fashion", name: "Fashion", parentId: null },
  { id: "beauty", name: "Beauty & Personal Care", parentId: null },
  { id: "sports", name: "Sports & Fitness", parentId: null },
  { id: "toys", name: "Toys & Games", parentId: null },
  { id: "grocery", name: "Grocery", parentId: null },
  { id: "office", name: "Office Products", parentId: null },
  { id: "other", name: "Other", parentId: null },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryName(id: string): string {
  return CATEGORY_BY_ID.get(id)?.name ?? id;
}

/** Fixed categorical palette, one colour per category, in legend order. */
export const CATEGORY_COLORS: Record<string, string> = {
  // Validated categorical palette (CVD-safe on adjacent pairs). "Other" is grey by design.
  electronics: "#2a78d6",
  "home-kitchen": "#eb6834",
  fashion: "#1baf7a",
  beauty: "#eda100",
  sports: "#e87ba4",
  toys: "#008300",
  grocery: "#6250d6",
  office: "#e34948",
  other: "#8b8a85",
};

/**
 * Assumptions used by the opportunity engine and the profit calculator.
 * Referral fees are approximate Amazon.in rates for a mid price band. They
 * are estimates and must be checked against the current Amazon.in fee
 * schedule; users can override them in the calculator.
 */
export interface CategoryEconomics {
  referralFeePct: number;
  /** Typical GST rate on goods in this category. */
  gstRatePct: number;
  /** Typical landed cost as a share of the selling price, for screening only. */
  typicalCostRatio: number;
  returnRisk: "low" | "medium" | "high";
}

export const CATEGORY_ECONOMICS: Record<string, CategoryEconomics> = {
  electronics: { referralFeePct: 9, gstRatePct: 18, typicalCostRatio: 0.55, returnRisk: "high" },
  "home-kitchen": { referralFeePct: 12, gstRatePct: 18, typicalCostRatio: 0.42, returnRisk: "medium" },
  fashion: { referralFeePct: 17, gstRatePct: 12, typicalCostRatio: 0.35, returnRisk: "high" },
  beauty: { referralFeePct: 8, gstRatePct: 18, typicalCostRatio: 0.4, returnRisk: "low" },
  sports: { referralFeePct: 12, gstRatePct: 12, typicalCostRatio: 0.45, returnRisk: "medium" },
  toys: { referralFeePct: 11, gstRatePct: 18, typicalCostRatio: 0.45, returnRisk: "low" },
  grocery: { referralFeePct: 5, gstRatePct: 5, typicalCostRatio: 0.65, returnRisk: "low" },
  office: { referralFeePct: 10, gstRatePct: 18, typicalCostRatio: 0.45, returnRisk: "low" },
  other: { referralFeePct: 12, gstRatePct: 18, typicalCostRatio: 0.5, returnRisk: "medium" },
};

/** Approximate Amazon.in closing fee by price band (Easy Ship / standard). */
export function estimateClosingFee(price: number): number {
  if (price <= 250) return 4;
  if (price <= 500) return 9;
  if (price <= 1000) return 30;
  return 61;
}
