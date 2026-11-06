import { opportunity, periodReport, productSummaries, type Dataset } from "./analytics/engine";
import { categoryRows } from "./analytics/overview";
import { resolvePeriod, type PeriodParams } from "./analytics/periods";
import { trendingRows } from "./analytics/trending";
import { categoryName } from "./categories";
import { formatRange } from "./dates";
import type { DataSourceKind } from "./types";

export type ReportType = "daily" | "weekly" | "monthly" | "yearly" | "category" | "trending" | "opportunity";

export const REPORT_TYPES: { key: ReportType; label: string; defaultPeriod: string; periodic: boolean }[] = [
  { key: "daily", label: "Daily product report", defaultPeriod: "yesterday", periodic: true },
  { key: "weekly", label: "Weekly product report", defaultPeriod: "last_week", periodic: true },
  { key: "monthly", label: "Monthly product report", defaultPeriod: "last_month", periodic: true },
  { key: "yearly", label: "Yearly product report", defaultPeriod: "this_year", periodic: true },
  { key: "category", label: "Category performance report", defaultPeriod: "this_month", periodic: true },
  { key: "trending", label: "Trending product report", defaultPeriod: "", periodic: false },
  { key: "opportunity", label: "Product opportunity report", defaultPeriod: "", periodic: false },
];

export const PERIOD_CHOICES: Record<string, [string, string][]> = {
  daily: [
    ["today", "Today"],
    ["yesterday", "Yesterday"],
  ],
  weekly: [
    ["this_week", "This week"],
    ["last_week", "Last week"],
  ],
  monthly: [
    ["this_month", "This month"],
    ["last_month", "Last month"],
  ],
  yearly: [
    ["this_year", "This year"],
    ["last_year", "Last year"],
  ],
  category: [
    ["this_week", "This week"],
    ["this_month", "This month"],
    ["last_month", "Last month"],
    ["this_year", "This year"],
  ],
};

export interface Report {
  title: string;
  period: string;
  generatedAt: string;
  notes: string[];
  columns: string[];
  rows: (string | number | null)[][];
  available: boolean;
}

const SOURCE_NOTE: Record<DataSourceKind, string> = {
  demo: "DEMO DATA — synthetic values for product evaluation only. Not real market data.",
  pa_api: "Amazon Product Advertising API (listing data).",
  sp_api: "Amazon Selling Partner API (your seller account).",
  licensed: "Licensed third-party research provider.",
  csv: "User-uploaded CSV history.",
};

const r1 = (x: number | null | undefined) => (x == null ? null : Math.round(x * 10) / 10);

export function buildReport(ds: Dataset, sources: DataSourceKind[], type: ReportType, params: PeriodParams, generatedAt: string): Report {
  const def = REPORT_TYPES.find((t) => t.key === type)!;
  const notes = [
    ...sources.map((s) => `Data source: ${SOURCE_NOTE[s]}`),
    "Demand index (0-100) is estimated from Best Sellers Rank. It is a relative popularity signal, not unit sales.",
  ];
  const base = { title: def.label, generatedAt, notes };

  if (type === "trending") {
    const { rows } = trendingRows(ds, "week");
    return {
      ...base,
      period: "Last 7 days vs previous 7 days",
      notes: [...notes, "Trend score is an internal Amazon Pulse score, not an official Amazon metric."],
      columns: ["Rank", "ASIN", "Title", "Category", "Trend score", "Demand change (pts)", "BSR", "Price (INR)"],
      rows: rows.map((r, i) => [i + 1, r.summary.product.asin, r.summary.product.title, categoryName(r.summary.product.categoryId), r.trend.score, r1(r.trend.demandDelta), r.summary.latest?.bsr ?? null, r.summary.latest?.price ?? null]),
      available: rows.length > 0,
    };
  }
  if (type === "opportunity") {
    const ops = productSummaries(ds)
      .map((s) => opportunity(ds, s))
      .filter((o) => o.score != null)
      .sort((a, b) => b.score! - a.score!);
    return {
      ...base,
      period: "Last 30 days",
      notes: [...notes, "Opportunity score and margin use category cost/fee assumptions; verify with your own costs."],
      columns: ["Rank", "ASIN", "Title", "Category", "Opportunity score", "Class", "Est. net margin %", "Price (INR)", "Explanation"],
      rows: ops.map((o, i) => [i + 1, o.summary.product.asin, o.summary.product.title, categoryName(o.summary.product.categoryId), o.score, o.classification, o.estimatedMarginPct, o.summary.latest?.price ?? null, o.explanation]),
      available: ops.length > 0,
    };
  }

  const per = resolvePeriod({ ...params, p: params.p || def.defaultPeriod }, ds.today);
  const period = `${per.label} (${formatRange(per.range.start, per.range.end)}) vs ${per.compare.label} (${formatRange(per.compare.range.start, per.compare.range.end)})`;
  const rep = periodReport(ds, per.range, per.compare.range, 100);
  const cov = `Coverage: ${rep.coverage.coveredDays} of ${rep.coverage.totalDays} days have snapshots.`;
  if (rep.coverage.status === "none") {
    return { ...base, period, notes: [...notes, "Historical data not available for this period."], columns: [], rows: [], available: false };
  }
  if (type === "category") {
    const rows = categoryRows(ds, per.range, per.compare.range);
    return {
      ...base,
      period,
      notes: [...notes, cov],
      columns: ["Category", "Products", "Avg demand index", "Previous avg demand", "Change (pts)", "Top-50 share %"],
      rows: rows.map((r) => [r.name, r.products, r.avgDemand, r.previousAvgDemand, r.change, Math.round(r.topShare * 100)]),
      available: true,
    };
  }
  const prev = new Map(rep.previousRanking.map((r) => [r.productId, r.rank]));
  return {
    ...base,
    period,
    notes: [...notes, cov],
    columns: ["Rank", "Previous rank", "ASIN", "Title", "Brand", "Category", "Avg demand index", "Avg BSR", "Best BSR", "Start price (INR)", "End price (INR)", "Price change %", "New reviews", "Rating", "Days observed"],
    rows: rep.ranking
      .slice(0, 100)
      .map((r) => [
        r.rank,
        prev.get(r.productId) ?? null,
        r.product.asin,
        r.product.title,
        r.product.brand,
        categoryName(r.product.categoryId),
        r1(r.avgDemand),
        r.avgBsr,
        r.bestBsr,
        r.startPrice,
        r.endPrice,
        r1(r.priceChangePct),
        r.reviewsGained,
        r.endRating,
        r.observations,
      ]),
    available: true,
  };
}

function csvCell(v: string | number | null): string {
  if (v == null) return "";
  let s = String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function reportToCSV(r: Report): string {
  const lines = [
    [`${r.title}`],
    [`Period: ${r.period}`],
    [`Generated: ${r.generatedAt}`],
    ...r.notes.map((n) => [n]),
    [],
    r.columns,
    ...r.rows,
  ];
  // BOM so Excel opens UTF-8 (₹, accented brands) correctly.
  return "﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\r\n");
}
