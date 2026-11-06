import "server-only";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { DataContext } from "../data/repository";
import { opportunity, periodReport, productSummaries, seasonality, type ProductSummary } from "../analytics/engine";
import { filterProducts, sortProducts, SORT_LABELS, type SortKey } from "../analytics/explorer";
import { categoryRows } from "../analytics/overview";
import { resolvePeriod } from "../analytics/periods";
import { LENSES, trendingRows, type Lens } from "../analytics/trending";
import { productNarrative } from "../analytics/narrative";
import { CATEGORIES, categoryName } from "../categories";

/**
 * Tools for Amazon Pulse AI. Every tool calls the same analytics functions the
 * screens use, and every result carries its period, coverage, data source and
 * freshness, so answers can only be built from records that exist.
 */

const r1 = (x: number | null | undefined) => (x == null ? null : Math.round(x * 10) / 10);
const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [string, ...string[]];

const periodSchema = z
  .object({
    p: z
      .enum(["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "this_year", "last_year", "day", "week", "month", "year", "custom"])
      .describe("Period preset. Use day/week/month/year with d/m/y for specific historical periods, custom with from/to."),
    d: z.string().optional().describe("YYYY-MM-DD for p=day, or any date inside the week for p=week"),
    m: z.string().optional().describe("YYYY-MM for p=month"),
    y: z.string().optional().describe("YYYY for p=year"),
    from: z.string().optional().describe("YYYY-MM-DD start for p=custom"),
    to: z.string().optional().describe("YYYY-MM-DD end for p=custom"),
  })
  .describe("The time period to analyse");

function brief(s: ProductSummary) {
  return {
    asin: s.product.asin,
    title: s.product.title,
    brand: s.product.brand,
    category: categoryName(s.product.categoryId),
    price_inr: s.latest?.price ?? null,
    rating: s.latest?.rating ?? null,
    reviews: s.latest?.reviewCount ?? null,
    bsr: s.latest?.bsr ?? null,
    demand_index: s.demand,
    demand_change_7d_pts: s.demandDelta7d,
    trend_score: s.trend.score,
    trend_direction: s.trend.direction,
    competition_indicator: s.competition,
    last_updated: s.lastUpdated,
  };
}

export function buildTools(ctx: DataContext) {
  const { ds } = ctx;
  const meta = {
    data_source: ctx.sources,
    is_demo_data: ctx.mode === "demo",
    today: ds.today,
    latest_snapshot: ctx.lastSnapshot,
    history_since: ctx.firstSnapshot,
  };
  const json = (x: unknown) => JSON.stringify({ ...meta, ...(x as object) });

  return [
    betaZodTool({
      name: "period_ranking",
      description:
        "Top products for a period, ranked by average estimated demand index over the days with snapshots, with the comparison period, coverage, entering/leaving products and category mix. Use for 'top products today/this week/last January/2025' questions.",
      inputSchema: z.object({
        period: periodSchema,
        top_n: z.number().int().min(1).max(50).default(10),
        category: z.enum(CATEGORY_IDS).optional(),
        max_price_inr: z.number().positive().optional(),
      }),
      run: async ({ period, top_n, category, max_price_inr }) => {
        const per = resolvePeriod(period, ds.today);
        if (per.future) return json({ period: per.label, error: "This period is in the future; no snapshots exist." });
        const rep = periodReport(ds, per.range, per.compare.range, top_n);
        if (rep.coverage.status === "none") {
          return json({ period: per.label, range: per.range, coverage: rep.coverage, result: "Historical data not available for this period." });
        }
        const prev = new Map(rep.previousRanking.map((r) => [r.productId, r.rank]));
        const rows = rep.ranking
          .filter((r) => (!category || r.product.categoryId === category) && (!max_price_inr || (r.endPrice ?? Infinity) <= max_price_inr))
          .slice(0, top_n)
          .map((r) => ({
            rank: r.rank,
            previous_rank: prev.get(r.productId) ?? null,
            asin: r.product.asin,
            title: r.product.title,
            category: categoryName(r.product.categoryId),
            avg_demand_index: r1(r.avgDemand),
            avg_bsr: r.avgBsr,
            end_price_inr: r.endPrice,
            price_change_pct: r1(r.priceChangePct),
            new_reviews: r.reviewsGained,
            days_observed: r.observations,
          }));
        return json({
          period: per.label,
          range: per.range,
          comparison: { label: per.compare.label, range: per.compare.range, coverage: rep.compareCoverage },
          coverage: rep.coverage,
          products: rows,
          entering_top: rep.entering.slice(0, 10).map((m) => ({ asin: m.product.asin, title: m.product.title, rank: m.rank, previous_rank: m.previousRank })),
          leaving_top: rep.leaving.slice(0, 10).map((m) => ({ asin: m.product.asin, title: m.product.title, rank: m.rank, previous_rank: m.previousRank })),
          category_mix: rep.categoryDistribution.map((c) => ({ category: c.name, products: c.products })),
        });
      },
    }),
    betaZodTool({
      name: "search_products",
      description: "Filter and sort tracked products by current data (latest snapshot). Use for price limits, demand levels, rising/falling trend, low competition, brand or keyword searches.",
      inputSchema: z.object({
        query: z.string().optional().describe("Words matched against title, ASIN, brand, category and subcategory"),
        category: z.enum(CATEGORY_IDS).optional(),
        min_price_inr: z.number().nonnegative().optional(),
        max_price_inr: z.number().positive().optional(),
        min_rating: z.number().min(0).max(5).optional(),
        demand_levels: z.array(z.enum(["very_high", "high", "medium", "low"])).optional(),
        trend: z.enum(["up", "flat", "down"]).optional().describe("14-day demand trend"),
        sort: z.enum(Object.keys(SORT_LABELS) as [SortKey, ...SortKey[]]).default("demand"),
        limit: z.number().int().min(1).max(25).default(10),
      }),
      run: async (i) => {
        const rows = sortProducts(
          filterProducts(
            productSummaries(ds),
            {
              q: i.query,
              cat: i.category,
              pmin: i.min_price_inr?.toString(),
              pmax: i.max_price_inr?.toString(),
              rmin: i.min_rating?.toString(),
              demand: i.demand_levels?.join(","),
              trend: i.trend,
            },
            ds.today,
          ),
          i.sort,
        );
        return json({ matched: rows.length, sort: SORT_LABELS[i.sort], products: rows.slice(0, i.limit).map(brief) });
      },
    }),
    betaZodTool({
      name: "trending",
      description: `Products with improving signals. Lenses: ${LENSES.map((l) => `${l.key} (${l.description})`).join("; ")}. Trend scores are internal Amazon Pulse scores, not Amazon metrics.`,
      inputSchema: z.object({ lens: z.enum(LENSES.map((l) => l.key) as [Lens, ...Lens[]]), limit: z.number().int().min(1).max(25).default(10) }),
      run: async ({ lens, limit }) => {
        const { rows, note } = trendingRows(ds, lens);
        return json({ lens, matched: rows.length, note, products: rows.slice(0, limit).map((r) => ({ ...brief(r.summary), lens_trend_score: r.trend.score, evidence: r.evidence })) });
      },
    }),
    betaZodTool({
      name: "category_performance",
      description: "Average demand index, change vs the comparison period and share of the top 50 for each category in a period.",
      inputSchema: z.object({ period: periodSchema }),
      run: async ({ period }) => {
        const per = resolvePeriod(period, ds.today);
        const rep = periodReport(ds, per.range, per.compare.range, 50);
        if (rep.coverage.status === "none") return json({ period: per.label, result: "Historical data not available for this period." });
        return json({
          period: per.label,
          range: per.range,
          comparison: per.compare,
          coverage: rep.coverage,
          categories: categoryRows(ds, per.range, per.compare.range).map((c) => ({
            category: c.name,
            products: c.products,
            avg_demand_index: c.avgDemand,
            previous_avg_demand_index: c.previousAvgDemand,
            change_pts: c.change,
            top50_share_pct: Math.round(c.topShare * 100),
          })),
        });
      },
    }),
    betaZodTool({
      name: "product_detail",
      description: "Everything known about one product: current listing data, trend score breakdown, monthly seasonality profile and a data-backed history summary.",
      inputSchema: z.object({ asin: z.string().regex(/^[A-Za-z0-9]{10}$/) }),
      run: async ({ asin }) => {
        const s = productSummaries(ds).find((x) => x.product.asin === asin.toUpperCase());
        if (!s) return json({ error: `ASIN ${asin} is not tracked.` });
        const seas = seasonality(ds.snapshots.get(s.product.id) ?? []);
        return json({
          product: brief(s),
          first_seen: s.product.firstSeen,
          trend_components: s.trend.components,
          trend_note: s.trend.insufficient,
          seasonality: { months_of_history: seas.monthsOfData, peak_months: seas.peakMonths, monthly_avg_demand: seas.monthly },
          history_summary: productNarrative(ds, s).sentences,
        });
      },
    }),
    betaZodTool({
      name: "compare_products",
      description: "Side-by-side metrics for 2 to 5 products, including opportunity score and estimated margin.",
      inputSchema: z.object({ asins: z.array(z.string()).min(2).max(5) }),
      run: async ({ asins }) => {
        const all = productSummaries(ds);
        const items = asins.map((a) => all.find((x) => x.product.asin === a.toUpperCase())).filter((x): x is ProductSummary => !!x);
        return json({
          not_found: asins.filter((a) => !items.some((x) => x.product.asin === a.toUpperCase())),
          products: items.map((s) => {
            const o = opportunity(ds, s);
            return { ...brief(s), opportunity_score: o.score, opportunity_class: o.classification, est_net_margin_pct: o.estimatedMarginPct, seasonal_peaks: seasonality(ds.snapshots.get(s.product.id) ?? []).peakMonths };
          }),
        });
      },
    }),
    betaZodTool({
      name: "opportunities",
      description:
        "Products ranked by the internal opportunity score (demand, competition, margin, price band, return risk, seasonality, rating gap), with the explanation for each. Margins use category cost assumptions, not the user's own costs.",
      inputSchema: z.object({
        classification: z.enum(["high", "medium", "low"]).optional(),
        category: z.enum(CATEGORY_IDS).optional(),
        max_price_inr: z.number().positive().optional(),
        limit: z.number().int().min(1).max(25).default(10),
      }),
      run: async (i) => {
        const ops = productSummaries(ds)
          .filter((s) => (!i.category || s.product.categoryId === i.category) && (!i.max_price_inr || (s.latest?.price ?? Infinity) <= i.max_price_inr))
          .map((s) => opportunity(ds, s))
          .filter((o) => o.score != null && (!i.classification || o.classification === i.classification))
          .sort((a, b) => b.score! - a.score!);
        return json({
          matched: ops.length,
          products: ops.slice(0, i.limit).map((o) => ({ ...brief(o.summary), opportunity_score: o.score, class: o.classification, est_net_margin_pct: o.estimatedMarginPct, explanation: o.explanation })),
        });
      },
    }),
  ];
}
