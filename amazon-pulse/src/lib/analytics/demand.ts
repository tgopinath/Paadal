import type { DemandLevel, TrendDirection } from "../types";

/** Rank treated as "no measurable demand" when mapping BSR to the index. */
const MAX_RANK = 500_000;

/**
 * Estimated demand index (0–100) from Best Sellers Rank on a log scale.
 * It is a relative popularity signal, NOT a unit-sales figure.
 */
export function bsrToDemandIndex(bsr: number): number {
  if (!Number.isFinite(bsr) || bsr <= 0) return 0;
  const v = 100 * (1 - Math.log10(bsr) / Math.log10(MAX_RANK));
  return Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
}

export function demandLevel(index: number | null): DemandLevel | null {
  if (index == null) return null;
  if (index >= 65) return "very_high";
  if (index >= 50) return "high";
  if (index >= 35) return "medium";
  return "low";
}

export const DEMAND_LEVEL_LABEL: Record<DemandLevel, string> = {
  very_high: "Very high",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function trendDirection(deltaIndexPoints: number | null): TrendDirection {
  if (deltaIndexPoints == null) return "flat";
  if (deltaIndexPoints > 2) return "up";
  if (deltaIndexPoints < -2) return "down";
  return "flat";
}

export function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function clamp(x: number, lo = 0, hi = 100): number {
  return Math.min(hi, Math.max(lo, x));
}
