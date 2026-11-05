import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { TableSkeleton } from "@/components/common/skeletons";
import { Delta } from "@/components/common/delta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MovementChart } from "@/components/history/movement-chart";
import { CategoryPanel } from "@/components/overview/category-panel";
import { getData } from "@/lib/data/repository";
import { demandSeries, rankProducts } from "@/lib/analytics/engine";
import { categoryRows } from "@/lib/analytics/overview";
import { CATEGORIES, CATEGORY_COLORS, categoryName } from "@/lib/categories";
import { addDays, addMonths } from "@/lib/dates";
import { formatINR } from "@/lib/format";
import { mean } from "@/lib/analytics/demand";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  return (
    <>
      <PageHeader title="Categories" description="How each Amazon category is performing: demand, share of top rankings and price levels over the last 30 days, compared with the 30 days before." />
      <Suspense fallback={<TableSkeleton rows={9} />}>
        <Categories searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Categories({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const { ds } = await getData();
  const range = { start: addDays(ds.today, -29), end: ds.today };
  const compare = { start: addDays(ds.today, -59), end: addDays(ds.today, -30) };
  const rows = categoryRows(ds, range, compare);
  const selected = CATEGORIES.find((x) => x.id === c)?.id ?? rows.sort((a, b) => (b.avgDemand ?? 0) - (a.avgDemand ?? 0))[0]?.categoryId;
  const ranking = rankProducts(ds, range, { categoryId: selected });
  const yr = { start: addMonths(ds.today, -11), end: ds.today };
  const catSeries = demandSeries(ds, yr, "month", { categoryId: selected });
  const allSeries = demandSeries(ds, yr, "month");
  const prices = (id: string) => mean(rankProducts(ds, range, { categoryId: id }).map((r) => r.endPrice).filter((x): x is number => x != null));

  return (
    <div className="space-y-6">
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <li key={r.categoryId}>
            <Link
              href={`/categories?c=${r.categoryId}`}
              scroll={false}
              aria-current={r.categoryId === selected ? "true" : undefined}
              className={cn("block rounded-lg border bg-white p-4 transition-shadow hover:shadow-md", r.categoryId === selected && "ring-2 ring-primary")}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="size-2.5 rounded-full" style={{ background: CATEGORY_COLORS[r.categoryId] }} aria-hidden />
                {r.name}
              </span>
              <span className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <span>
                  <span className="block text-muted-foreground">Demand</span>
                  <span className="tabular block text-base font-semibold">{r.avgDemand?.toFixed(1) ?? "—"}</span>
                  <Delta value={r.change} suffix=" pts" />
                </span>
                <span>
                  <span className="block text-muted-foreground">Top-50 share</span>
                  <span className="tabular block text-base font-semibold">{Math.round(r.topShare * 100)}%</span>
                </span>
                <span>
                  <span className="block text-muted-foreground">Avg price</span>
                  <span className="tabular block text-base font-semibold">{formatINR(prices(r.categoryId))}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <MovementChart
          title={`${categoryName(selected!)} · demand by month`}
          description="Average demand index, last 12 months, against the all-category average"
          rows={catSeries.map((p, i) => ({ label: p.label, current: p.value, previous: allSeries[i]?.value ?? null }))}
          currentLabel={categoryName(selected!)}
          previousLabel="All categories"
          fmt="index"
        />
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Top products in {categoryName(selected!)}</CardTitle>
              <CardDescription>Last 30 days, by average demand index</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-0">
            <ol>
              {ranking.slice(0, 10).map((r) => (
                <li key={r.productId}>
                  <Link href={`/products/${r.product.asin}`} className="flex items-center gap-3 px-5 py-2 text-sm hover:bg-surface sm:px-6">
                    <span className="tabular w-5 text-right text-muted-foreground">{r.rank}</span>
                    <span className="min-w-0 flex-1 truncate">{r.product.title}</span>
                    <span className="tabular font-medium">{r.avgDemand!.toFixed(1)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
      <CategoryPanel rows={rows} periodLabel="Last 30 days" compareLabel="Previous 30 days" />
    </div>
  );
}
