import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ExternalLink, Sparkles, Star } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Delta } from "@/components/common/delta";
import { PanelSkeleton } from "@/components/common/skeletons";
import { ProductThumb } from "@/components/product/product-thumb";
import { DemandBadge, ScorePill, TrendBadge } from "@/components/product/badges";
import { CompareToggle, CompareTray, WatchButton } from "@/components/product/product-actions";
import { HistoryCharts, type Metric, type Window } from "@/components/detail/history-charts";
import { ScoreBreakdown } from "@/components/detail/score-breakdown";
import { getData } from "@/lib/data/repository";
import { demandSeries, opportunity, productSummaries, seasonality, monthName, type SeriesPoint } from "@/lib/analytics/engine";
import { productNarrative } from "@/lib/analytics/narrative";
import { categoryName } from "@/lib/categories";
import { addDays, addMonths, formatDay } from "@/lib/dates";
import { formatINR, formatInt } from "@/lib/format";

export const metadata: Metadata = { title: "Product detail" };

export default function ProductPage({ params }: { params: Promise<{ asin: string }> }) {
  return (
    <>
      <Link href="/products" className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Product Explorer
      </Link>
      <Suspense
        fallback={
          <div className="space-y-6">
            <PanelSkeleton height={160} />
            <PanelSkeleton height={380} />
          </div>
        }
      >
        <ProductDetail params={params} />
      </Suspense>
      <CompareTray />
    </>
  );
}

async function ProductDetail({ params }: { params: Promise<{ asin: string }> }) {
  const { asin } = await params;
  const { ds } = await getData();
  const s = productSummaries(ds).find((x) => x.product.asin === asin.toUpperCase());
  if (!s) notFound();
  const p = s.product;
  const t = ds.today;
  const ids = [p.id];
  const metrics: Metric[] = ["demand", "bsr", "price", "reviews"];
  const windows: Record<Window, { range: { start: string; end: string }; g: "day" | "week" | "month" | "year" }> = {
    day: { range: { start: addDays(t, -29), end: t }, g: "day" },
    week: { range: { start: addDays(t, -83), end: t }, g: "week" },
    month: { range: { start: addMonths(t, -11), end: t }, g: "month" },
    year: { range: { start: `${Number(t.slice(0, 4)) - 4}-01-01`, end: t }, g: "year" },
  };
  const history = Object.fromEntries(
    (Object.keys(windows) as Window[]).map((w) => [
      w,
      Object.fromEntries(
        metrics.map((m) => {
          let pts = demandSeries(ds, windows[w].range, windows[w].g, { productIds: ids, metric: m });
          if (w === "week") pts = pts.slice(-12);
          if (w === "year") pts = pts.filter((x) => x.covered > 0);
          return [m, pts];
        }),
      ),
    ]),
  ) as Record<Window, Record<Metric, SeriesPoint[]>>;
  const narrative = productNarrative(ds, s);
  const opp = opportunity(ds, s);
  const seas = seasonality(ds.snapshots.get(p.id) ?? []);

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row">
          <ProductThumb product={p} size={112} className="text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Link href={`/products?cat=${p.categoryId}`} className="hover:text-foreground">
                {categoryName(p.categoryId)}
              </Link>
              <span>›</span>
              <Link href={`/products?cat=${p.categoryId}&sub=${encodeURIComponent(p.subcategory)}`} className="hover:text-foreground">
                {p.subcategory}
              </Link>
            </div>
            <h1 className="mt-1 text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{p.title}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              ASIN <span className="font-mono text-foreground">{p.asin}</span> · Brand {p.brand} · Tracked since {formatDay(p.firstSeen)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <DemandBadge level={s.demandLevel} value={s.demand} />
              <TrendBadge direction={s.trend.direction} />
              {s.latest?.source === "demo" && <Badge variant="warning">Demo product</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-2 sm:flex-col sm:items-end">
            <WatchButton asin={p.asin} withLabel />
            <CompareToggle asin={p.asin} withLabel />
            {p.amazonUrl ? (
              <Button asChild variant="outline" size="sm">
                <a href={p.amazonUrl} target="_blank" rel="noopener noreferrer">
                  View on Amazon.in <ExternalLink />
                </a>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">No Amazon link (demo product)</span>
            )}
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3 xl:grid-cols-6">
          <Stat label="Current price" value={formatINR(s.latest?.price)} sub={s.previousPrice != null ? <>30 days ago {formatINR(s.previousPrice)}</> : "No price 30 days ago"} />
          <Stat label="List price" value={formatINR(s.latest?.listPrice)} sub={s.discountPct != null ? `${s.discountPct}% discount` : "—"} />
          <Stat
            label="Rating"
            value={
              s.latest?.rating != null ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                  {s.latest.rating.toFixed(1)}
                </span>
              ) : (
                "—"
              )
            }
            sub={`${formatInt(s.latest?.reviewCount)} reviews`}
          />
          <Stat label="Review growth" value={s.reviewsGained30d != null ? `+${formatInt(s.reviewsGained30d)}` : "—"} sub="Last 30 days" />
          <Stat
            label="Best Sellers Rank"
            value={s.latest?.bsr != null ? `#${formatInt(s.latest.bsr)}` : "—"}
            sub={s.rankChange7d == null ? "—" : s.rankChange7d === 0 ? "No change in 7 days" : <>{s.rankChange7d > 0 ? "▲ up" : "▼ down"} {formatInt(Math.abs(s.rankChange7d))} places in 7 days</>}
          />
          <Stat label="Demand index" value={s.demand?.toFixed(1) ?? "—"} sub={<Delta value={s.demandDelta7d} suffix=" pts (7d)" />} />
        </dl>
        <p className="mt-2 text-[11px] text-subtle-foreground">Last updated {s.lastUpdated ? formatDay(s.lastUpdated) : "—"} · source: {s.latest?.source ?? "—"}</p>
      </Card>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <HistoryCharts data={history} />
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" aria-hidden /> Performance summary
              </CardTitle>
              <CardDescription>Generated from this product&apos;s snapshots ({narrative.basis}). No figures are added beyond what the data shows.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5 text-sm leading-relaxed">
              {narrative.sentences.map((x) => (
                <li key={x} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  {x}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Trend score</CardTitle>
              <CardDescription>Internal score, not an Amazon metric. Last 14 days vs the 14 before.</CardDescription>
            </div>
            <ScorePill score={s.trend.score} label="Trend score" />
          </CardHeader>
          <CardContent>{s.trend.score == null ? <p className="text-sm text-muted-foreground">{s.trend.insufficient}</p> : <ScoreBreakdown components={s.trend.components} />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Opportunity score</CardTitle>
              <CardDescription>Screening estimate using category cost and fee assumptions.</CardDescription>
            </div>
            <ScorePill score={opp.score} label="Opportunity score" />
          </CardHeader>
          <CardContent>
            {opp.score == null ? (
              <p className="text-sm text-muted-foreground">{opp.insufficient}</p>
            ) : (
              <>
                <p className="mb-4 text-[13px]">{opp.explanation}</p>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/opportunities?asin=${p.asin}#calculator`}>Calculate profit with your costs</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Seasonality</CardTitle>
              <CardDescription>Average demand index by calendar month, from snapshot history.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {seas.monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground">Historical data not available.</p>
            ) : (
              <>
                <ol className="grid grid-cols-12 items-end gap-1" style={{ height: 96 }} aria-label="Monthly demand profile">
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = seas.monthly.find((x) => x.month === i + 1);
                    const max = Math.max(...seas.monthly.map((x) => x.avgDemand));
                    return (
                      <li key={i} className="flex h-full flex-col justify-end" title={m ? `${monthName(i + 1)}: ${m.avgDemand}` : `${monthName(i + 1)}: no data`}>
                        {m ? (
                          <span
                            className={`block rounded-t-[3px] ${seas.peakMonths.includes(i + 1) ? "bg-primary" : "bg-primary/35"}`}
                            style={{ height: `${Math.max(4, (m.avgDemand / max) * 100)}%` }}
                          />
                        ) : (
                          <span className="block h-1 rounded bg-surface-2" />
                        )}
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-1 grid grid-cols-12 gap-1 text-center text-[10px] text-muted-foreground">
                  {Array.from({ length: 12 }, (_, i) => (
                    <span key={i}>{monthName(i + 1)[0]}</span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {seas.monthsOfData < 12
                    ? `Only ${seas.monthsOfData} months of history — a full year is needed for a reliable seasonal pattern.`
                    : seas.peakMonths.length
                      ? `Peak months: ${seas.peakMonths.map(monthName).join(", ")} (highlighted). Based on ${seas.monthsOfData} months of snapshots.`
                      : `No pronounced seasonal peak across ${seas.monthsOfData} months.`}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub: React.ReactNode }) {
  return (
    <div className="bg-white p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular mt-1 text-lg font-semibold">{value}</dd>
      <dd className="mt-0.5 text-[11px] text-muted-foreground">{sub}</dd>
    </div>
  );
}
