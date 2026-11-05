import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GitCompareArrows } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { TableSkeleton } from "@/components/common/skeletons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ComparePicker } from "@/components/compare/picker";
import { COMPARE_COLORS, CompareChart } from "@/components/compare/compare-chart";
import { ProductThumb } from "@/components/product/product-thumb";
import { getData } from "@/lib/data/repository";
import { demandSeries, opportunity, productSummaries } from "@/lib/analytics/engine";
import { DEMAND_LEVEL_LABEL } from "@/lib/analytics/demand";
import { categoryName } from "@/lib/categories";
import { addDays } from "@/lib/dates";
import { formatINR, formatInt } from "@/lib/format";

export const metadata: Metadata = { title: "Product Comparison" };

export default function ComparePage({ searchParams }: { searchParams: Promise<{ asins?: string }> }) {
  return (
    <>
      <PageHeader title="Product Comparison" description="Compare up to five products side by side: price, ratings, reviews, BSR, demand, trend, opportunity and estimated profitability." />
      <Suspense fallback={<TableSkeleton rows={6} />}>
        <Compare searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Compare({ searchParams }: { searchParams: Promise<{ asins?: string }> }) {
  const { asins } = await searchParams;
  const { ds } = await getData();
  const all = productSummaries(ds);
  const byAsin = new Map(all.map((s) => [s.product.asin, s]));
  const selected = [...new Set((asins ?? "").split(",").map((a) => a.trim().toUpperCase()))].filter((a) => byAsin.has(a)).slice(0, 5);
  const options = all.map((s) => ({ asin: s.product.asin, title: s.product.title })).sort((a, b) => a.title.localeCompare(b.title));
  const picker = <ComparePicker selected={selected} options={options} />;

  if (selected.length < 2) {
    return (
      <div className="space-y-6">
        {picker}
        <EmptyState
          icon={GitCompareArrows}
          title={selected.length === 0 ? "Pick products to compare" : "Add at least one more product"}
          description="Search above, or use the compare button on any product in the explorer."
          action={
            <Button asChild variant="outline">
              <Link href="/products">Open Product Explorer</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const items = selected.map((a) => byAsin.get(a)!);
  const opps = items.map((s) => opportunity(ds, s));
  const range = { start: addDays(ds.today, -89), end: ds.today };
  const metricRows = (metric: "demand" | "bsr" | "price") => {
    const per = items.map((s) => demandSeries(ds, range, "day", { productIds: [s.product.id], metric }));
    return per[0].map((pt, i) => Object.fromEntries([["label", pt.label], ...per.map((p, j) => [`p${j}`, p[i].value])]));
  };
  const best = (vals: (number | null | undefined)[], dir: "max" | "min") => {
    const nums = vals.filter((v): v is number => v != null);
    if (!nums.length) return null;
    return dir === "max" ? Math.max(...nums) : Math.min(...nums);
  };
  type RowDef = { label: string; values: (number | null | undefined)[]; fmt: (v: number) => string; better?: "max" | "min"; note?: string };
  const rows: RowDef[] = [
    { label: "Price", values: items.map((s) => s.latest?.price), fmt: (v) => formatINR(v) },
    { label: "Discount", values: items.map((s) => s.discountPct), fmt: (v) => `${v}%` },
    { label: "Rating", values: items.map((s) => s.latest?.rating), fmt: (v) => `${v.toFixed(1)}★`, better: "max" },
    { label: "Reviews", values: items.map((s) => s.latest?.reviewCount), fmt: formatInt },
    { label: "New reviews (30d)", values: items.map((s) => s.reviewsGained30d), fmt: formatInt, better: "max" },
    { label: "Best Sellers Rank", values: items.map((s) => s.latest?.bsr), fmt: (v) => `#${formatInt(v)}`, better: "min", note: "Comparable within a category only" },
    { label: "Demand index", values: items.map((s) => s.demand), fmt: (v) => v.toFixed(1), better: "max" },
    { label: "Trend score", values: items.map((s) => s.trend.score), fmt: (v) => `${v}/100`, better: "max" },
    { label: "Opportunity score", values: opps.map((o) => o.score), fmt: (v) => `${v}/100`, better: "max" },
    { label: "Est. net margin", values: opps.map((o) => o.estimatedMarginPct), fmt: (v) => `${v.toFixed(1)}%`, better: "max", note: "Category cost assumptions; use the calculator for yours" },
    { label: "Competition indicator", values: items.map((s) => s.competition), fmt: (v) => `${v}/100`, better: "min", note: "Higher = more entrenched" },
  ];

  return (
    <div className="space-y-6">
      {picker}
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH className="sticky left-0 z-10 bg-surface">Metric</TH>
              {items.map((s, i) => (
                <TH key={s.product.id} className="min-w-[180px] align-top">
                  <Link href={`/products/${s.product.asin}`} className="flex items-start gap-2 py-2 font-medium text-foreground hover:text-primary">
                    <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ background: COMPARE_COLORS[i] }} aria-hidden />
                    <ProductThumb product={s.product} size={32} />
                    <span className="line-clamp-2 whitespace-normal leading-snug">{s.product.title}</span>
                  </Link>
                </TH>
              ))}
            </tr>
          </THead>
          <TBody>
            <TR>
              <TD className="sticky left-0 bg-white text-muted-foreground">Category</TD>
              {items.map((s) => (
                <TD key={s.product.id}>{categoryName(s.product.categoryId)}</TD>
              ))}
            </TR>
            <TR>
              <TD className="sticky left-0 bg-white text-muted-foreground">Demand level</TD>
              {items.map((s) => (
                <TD key={s.product.id}>{s.demandLevel ? DEMAND_LEVEL_LABEL[s.demandLevel] : "—"}</TD>
              ))}
            </TR>
            {rows.map((r) => {
              const b = r.better ? best(r.values, r.better) : null;
              return (
                <TR key={r.label}>
                  <TD className="sticky left-0 bg-white">
                    <span className="text-muted-foreground">{r.label}</span>
                    {r.note && <span className="block text-[11px] text-subtle-foreground">{r.note}</span>}
                  </TD>
                  {r.values.map((v, i) => (
                    <TD key={i} className={`tabular ${b != null && v === b ? "font-semibold text-positive" : ""}`}>
                      {v == null ? "—" : r.fmt(v)}
                      {b != null && v === b && <span className="sr-only"> (best)</span>}
                    </TD>
                  ))}
                </TR>
              );
            })}
          </TBody>
        </Table>
      </Card>
      <CompareChart
        names={items.map((s) => s.product.title)}
        series={{ demand: metricRows("demand"), bsr: metricRows("bsr"), price: metricRows("price") }}
      />
    </div>
  );
}
