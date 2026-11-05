import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { CoverageNote, EmptyState, NoHistory } from "@/components/common/states";
import { PanelSkeleton, TableSkeleton } from "@/components/common/skeletons";
import { Delta } from "@/components/common/delta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodPicker } from "@/components/history/period-picker";
import { TopTable, type TopRow } from "@/components/history/top-table";
import { MovementChart } from "@/components/history/movement-chart";
import { getData } from "@/lib/data/repository";
import { demandSeries, periodReport, type RankMover } from "@/lib/analytics/engine";
import { pctChange } from "@/lib/analytics/demand";
import { resolvePeriod, type PeriodParams } from "@/lib/analytics/periods";
import { CATEGORY_COLORS, categoryName } from "@/lib/categories";
import { formatRange } from "@/lib/dates";
import { formatINR } from "@/lib/format";

export const metadata: Metadata = { title: "Historical Analytics" };

export default function HistoryPage({ searchParams }: { searchParams: Promise<PeriodParams> }) {
  return (
    <>
      <PageHeader
        title="Historical Analytics"
        description="Pick any day, week, month, year or custom range to see what performed best then. Reports use only the snapshots captured inside the period. Today's data is never relabelled as history."
      />
      <Suspense
        fallback={
          <div className="space-y-6">
            <PanelSkeleton height={110} />
            <TableSkeleton />
          </div>
        }
      >
        <History searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function History({ searchParams }: { searchParams: Promise<PeriodParams> }) {
  const params = await searchParams;
  const { ds, firstSnapshot } = await getData();
  const per = resolvePeriod(params, ds.today);
  const firstYear = Number((firstSnapshot ?? ds.today).slice(0, 4));

  const header = (
    <div className="space-y-4">
      <PeriodPicker today={ds.today} firstYear={firstYear} />
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {per.label}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {formatRange(per.range.start, per.range.end)}
            {per.inProgress && " · in progress"}
          </span>
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Compared with {per.compare.label.toLowerCase()} ({formatRange(per.compare.range.start, per.compare.range.end)})
        </p>
      </div>
    </div>
  );

  if (per.future) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState icon={CalendarClock} title="This period hasn't happened yet" description="Snapshots only exist for dates up to today. Pick a past or current period." />
      </div>
    );
  }

  const r = periodReport(ds, per.range, per.compare.range, 50);
  if (r.coverage.status === "none") {
    return (
      <div className="space-y-6">
        {header}
        <NoHistory label={`${per.label} (${formatRange(per.range.start, per.range.end)})`} firstSnapshot={firstSnapshot} />
      </div>
    );
  }

  const prevRank = new Map(r.previousRanking.map((x) => [x.productId, x.rank]));
  const top: TopRow[] = r.ranking.slice(0, 50).map((x) => ({
    rank: x.rank,
    previousRank: r.previousRanking.length ? (prevRank.get(x.productId) ?? null) : null,
    asin: x.product.asin,
    title: x.product.title,
    categoryId: x.product.categoryId,
    avgDemand: x.avgDemand!,
    avgBsr: x.avgBsr,
    bestBsr: x.bestBsr,
    endPrice: x.endPrice,
    priceChangePct: x.priceChangePct,
    reviewsGained: x.reviewsGained,
    observations: x.observations,
  }));

  const g = per.chartGranularity;
  const cur = demandSeries(ds, per.range, g);
  const prev = demandSeries(ds, per.compare.range, g);
  const curP = demandSeries(ds, per.range, g, { metric: "price" });
  const prevP = demandSeries(ds, per.compare.range, g, { metric: "price" });
  const align = (a: typeof cur, b: typeof cur) => a.map((p, i) => ({ label: p.label, current: p.value, previous: b[i]?.value ?? null }));
  const hasCompare = r.compareCoverage.status !== "none";

  return (
    <div className="space-y-6">
      {header}
      <div className="space-y-2">
        <CoverageNote coverage={r.coverage} label="Selected period" />
        {!hasCompare ? (
          <p className="rounded-md bg-surface px-3 py-2 text-[13px] text-muted-foreground">
            Historical data not available for the comparison period ({formatRange(per.compare.range.start, per.compare.range.end)}), so movement and entering/leaving lists can&apos;t be calculated.
          </p>
        ) : (
          <CoverageNote coverage={r.compareCoverage} label="Comparison period" />
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryStat label="Days with snapshots" value={`${r.coverage.coveredDays} / ${r.coverage.totalDays}`} />
        <SummaryStat label="Products ranked" value={r.ranking.length.toLocaleString("en-IN")} delta={hasCompare ? pctChange(r.ranking.length, r.previousRanking.length) : null} />
        <SummaryStat label="Avg demand index" value={r.avgDemand?.toFixed(1) ?? "—"} delta={hasCompare ? pctChange(r.avgDemand, r.previousAvgDemand) : null} />
        <SummaryStat label="Avg selling price" value={formatINR(r.avgPrice)} delta={hasCompare ? pctChange(r.avgPrice, r.previousAvgPrice) : null} />
      </dl>

      <TopTable rows={top} periodLabel={per.label} compareLabel={per.compare.label} />

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <MovementChart
          title="Demand movement"
          description={`Average demand index per ${g} across all products`}
          rows={align(cur, prev)}
          currentLabel={per.label}
          previousLabel={per.compare.label}
          fmt="index"
        />
        <MovementChart
          title="Price movement"
          description={`Average listed price per ${g} across all products`}
          rows={align(curP, prevP)}
          currentLabel={per.label}
          previousLabel={per.compare.label}
          fmt="inr"
        />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Category distribution</CardTitle>
              <CardDescription>Share of the top 50 by category</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {r.categoryDistribution.map((c) => (
                <li key={c.categoryId}>
                  <div className="flex justify-between text-[13px]">
                    <span>{c.name}</span>
                    <span className="tabular text-muted-foreground">
                      {c.products} · {Math.round(c.share * 100)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${c.share * 100}%`, background: CATEGORY_COLORS[c.categoryId] }} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <MoverList title="Entering the top 50" description={`In the top 50 now, not in ${per.compare.label.toLowerCase()}`} rows={r.entering} up hasCompare={hasCompare} />
        <MoverList title="Dropping out of the top 50" description={`In the top 50 in ${per.compare.label.toLowerCase()}, not now`} rows={r.leaving} hasCompare={hasCompare} />
      </div>

      {r.priceMovers.length > 0 && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Biggest price moves in the period</CardTitle>
              <CardDescription>First vs last captured price inside the period</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
              {r.priceMovers.map((m) => (
                <li key={m.product.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/products/${m.product.asin}`} className="truncate hover:text-primary">
                    {m.product.title}
                  </Link>
                  <span className="tabular shrink-0 text-[13px]">
                    {formatINR(m.from)} → {formatINR(m.to)} <Delta value={m.pct} inverse />
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryStat({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="rounded-lg border p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular mt-1 text-xl font-semibold">{value}</dd>
      {delta !== undefined && (
        <dd className="mt-1">
          <Delta value={delta} />
        </dd>
      )}
    </div>
  );
}

function MoverList({ title, description, rows, up = false, hasCompare }: { title: string; description: string; rows: RankMover[]; up?: boolean; hasCompare: boolean }) {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-1.5">
            {up ? <ArrowUpRight className="size-4 text-positive" aria-hidden /> : <ArrowDownRight className="size-4 text-negative" aria-hidden />}
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {!hasCompare ? (
          <p className="text-[13px] text-muted-foreground">Needs comparison-period snapshots.</p>
        ) : rows.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No changes to the top 50.</p>
        ) : (
          <ul className="space-y-2">
            {rows.slice(0, 10).map((m) => (
              <li key={m.product.id} className="flex items-center justify-between gap-3 text-[13px]">
                <Link href={`/products/${m.product.asin}`} className="min-w-0 truncate hover:text-primary">
                  {m.product.title}
                  <span className="block text-[11px] text-muted-foreground">{categoryName(m.product.categoryId)}</span>
                </Link>
                <span className="tabular shrink-0 text-muted-foreground">
                  {m.previousRank ? `#${m.previousRank}` : "new"} → {m.rank ? `#${m.rank}` : "unranked"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
