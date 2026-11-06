import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { TableSkeleton } from "@/components/common/skeletons";
import { WatchlistView, type WatchItem } from "@/components/watchlist/watchlist-view";
import { getData } from "@/lib/data/repository";
import { productSummaries } from "@/lib/analytics/engine";
import { categoryName } from "@/lib/categories";

export const metadata: Metadata = { title: "My Watchlist" };

export default function WatchlistPage() {
  return (
    <>
      <PageHeader title="My Watchlist" description="Products you're tracking, grouped into collections, with price, rank and demand changes and your alert rules." />
      <Suspense fallback={<TableSkeleton rows={4} />}>
        <Watchlist />
      </Suspense>
    </>
  );
}

async function Watchlist() {
  const { ds } = await getData();
  const items: WatchItem[] = productSummaries(ds).map((s) => ({
    asin: s.product.asin,
    title: s.product.title,
    category: categoryName(s.product.categoryId),
    price: s.latest?.price ?? null,
    previousPrice: s.previousPrice,
    bsr: s.latest?.bsr ?? null,
    rankChange7d: s.rankChange7d,
    demand: s.demand,
    demandDelta7d: s.demandDelta7d,
    trendScore: s.trend.score,
    sparkline: s.sparkline,
  }));
  return <WatchlistView items={items} />;
}
