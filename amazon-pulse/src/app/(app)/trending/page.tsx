import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Info, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, NoDataYet } from "@/components/common/states";
import { TableSkeleton } from "@/components/common/skeletons";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { ProductThumb } from "@/components/product/product-thumb";
import { ScorePill } from "@/components/product/badges";
import { WatchButton } from "@/components/product/product-actions";
import { ScoreBreakdown } from "@/components/detail/score-breakdown";
import { getData } from "@/lib/data/repository";
import { LENSES, trendingRows, type Lens } from "@/lib/analytics/trending";
import { categoryName } from "@/lib/categories";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Trending Now" };

export default function TrendingPage({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  return (
    <>
      <PageHeader
        title="Trending Now"
        description="Products with improving demand signals. The trend score (0–100) is an internal Amazon Pulse score, not an official Amazon metric; 50 means no change."
      />
      <Suspense fallback={<TableSkeleton rows={6} />}>
        <Trending searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Trending({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const { lens: raw } = await searchParams;
  const lens = (LENSES.some((l) => l.key === raw) ? raw : "week") as Lens;
  const { ds } = await getData();
  if (ds.products.length === 0) return <NoDataYet />;
  const { rows, note } = trendingRows(ds, lens);
  const meta = LENSES.find((l) => l.key === lens)!;

  return (
    <div className="space-y-5">
      <nav aria-label="Trend lens" className="-mx-4 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0">
        <ul className="flex gap-2">
          {LENSES.map((l) => (
            <li key={l.key}>
              <Link
                href={`/trending?lens=${l.key}`}
                aria-current={l.key === lens ? "page" : undefined}
                scroll={false}
                className={cn(
                  "inline-flex h-9 items-center whitespace-nowrap rounded-full border px-4 text-[13px] font-medium",
                  l.key === lens ? "border-primary bg-primary text-white" : "bg-white text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {meta.description} {rows.length} products.
      </p>
      {rows.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No products match this lens right now" description={note ?? "No product currently meets the threshold for this signal."} />
      ) : (
        <ol className="grid gap-3 lg:grid-cols-2">
          {rows.slice(0, 30).map((r, i) => (
            <li key={r.summary.product.id}>
              <Card className="h-full p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="tabular w-6 pt-0.5 text-right text-sm font-medium text-muted-foreground">{i + 1}</span>
                  <ProductThumb product={r.summary.product} size={48} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${r.summary.product.asin}`} className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary">
                      {r.summary.product.title}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {categoryName(r.summary.product.categoryId)} · {formatINR(r.summary.latest?.price)}
                    </p>
                    <p className="mt-1.5 text-[13px] text-foreground">{r.evidence}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <ScorePill score={r.trend.score} label="Trend score" />
                    <WatchButton asin={r.summary.product.asin} />
                  </div>
                </div>
                <div className="mt-3 pl-9">
                  <Sparkline data={r.summary.sparkline} height={32} label="Demand index, last 30 days" />
                  {r.trend.score != null && (
                    <details className="group mt-2">
                      <summary className="cursor-pointer list-none text-xs font-medium text-primary [&::-webkit-details-marker]:hidden">
                        <span className="group-open:hidden">Why this score?</span>
                        <span className="hidden group-open:inline">Hide breakdown</span>
                      </summary>
                      <div className="mt-3">
                        <ScoreBreakdown components={r.trend.components} />
                      </div>
                    </details>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
