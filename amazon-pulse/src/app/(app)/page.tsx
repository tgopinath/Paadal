import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { NoDataYet } from "@/components/common/states";
import { DataFreshness } from "@/components/common/freshness";
import { KpiCard } from "@/components/overview/kpi-card";
import { DemandPanel } from "@/components/overview/demand-panel";
import { RankingPanel } from "@/components/overview/ranking-panel";
import { CategoryPanel } from "@/components/overview/category-panel";
import { ComparisonPanel } from "@/components/overview/comparison-panel";
import { OverviewSkeleton } from "@/components/common/skeletons";
import { getData } from "@/lib/data/repository";
import { buildComparisons, buildDemandSeries, buildKpis, buildRankings, categoryRows } from "@/lib/analytics/overview";
import { resolvePeriod } from "@/lib/analytics/periods";

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Demand, rankings and category signals across every product you track. Demand figures are an estimated index from Best Sellers Rank, not unit sales."
        actions={
          <Suspense fallback={null}>
            <DataFreshness />
          </Suspense>
        }
      />
      <Suspense fallback={<OverviewSkeleton />}>
        <OverviewContent />
      </Suspense>
    </>
  );
}

async function OverviewContent() {
  const { ds } = await getData();
  if (ds.products.length === 0) return <NoDataYet />;
  const month = resolvePeriod({ p: "this_month" }, ds.today);
  const kpis = buildKpis(ds);
  return (
    <div className="space-y-6">
      {/* Phones: a swipeable row. Wider screens: a grid. */}
      <section
        aria-label="Key metrics"
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 md:grid-cols-3 2xl:grid-cols-6"
      >
        {kpis.map((k) => (
          <div key={k.key} className="w-[78%] shrink-0 snap-start sm:w-auto">
            <KpiCard kpi={k} />
          </div>
        ))}
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <DemandPanel series={buildDemandSeries(ds)} />
        <RankingPanel rankings={buildRankings(ds)} />
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <CategoryPanel rows={categoryRows(ds, month.range, month.compare.range)} periodLabel="This month to date" compareLabel={month.compare.label} />
        <ComparisonPanel blocks={buildComparisons(ds)} />
      </div>
    </div>
  );
}
