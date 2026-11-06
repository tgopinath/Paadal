import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/common/page-header";
import { NoDataYet } from "@/components/common/states";
import { PanelSkeleton, TableSkeleton } from "@/components/common/skeletons";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductThumb } from "@/components/product/product-thumb";
import { ScorePill } from "@/components/product/badges";
import { WatchButton } from "@/components/product/product-actions";
import { ScoreBreakdown } from "@/components/detail/score-breakdown";
import { ProfitCalculator, type CalculatorProduct } from "@/components/opportunity/calculator";
import { getData } from "@/lib/data/repository";
import { getCurrentUser } from "@/lib/auth/session";
import { opportunity, productSummaries, type OpportunityClass } from "@/lib/analytics/engine";
import { CATEGORIES, CATEGORY_ECONOMICS, categoryName, estimateClosingFee } from "@/lib/categories";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Opportunity Finder" };

const CLASS_META: Record<OpportunityClass, { label: string; variant: "positive" | "default" | "neutral" }> = {
  high: { label: "High opportunity", variant: "positive" },
  medium: { label: "Medium opportunity", variant: "default" },
  low: { label: "Low opportunity", variant: "neutral" },
};

type Params = { class?: string; cat?: string; asin?: string };

export default function OpportunitiesPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <PageHeader
        title="Opportunity Finder"
        description="Screens tracked products for selling potential: demand, competition, margin, price band, return risk, seasonality and rating gap. The opportunity score is an internal estimate built on stated assumptions. Use the calculator with your own costs before deciding."
      />
      <Suspense
        fallback={
          <div className="space-y-6">
            <TableSkeleton rows={5} />
            <PanelSkeleton height={500} />
          </div>
        }
      >
        <Opportunities searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Opportunities({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { ds, mode } = await getData();
  if (ds.products.length === 0) return <NoDataYet />;
  const canSave = mode === "production" && !!(await getCurrentUser());
  const all = productSummaries(ds).map((s) => opportunity(ds, s));
  const scored = all.filter((o) => o.score != null).sort((a, b) => b.score! - a.score!);
  const cls = (["high", "medium", "low"] as const).find((c) => c === params.class);
  const list = scored.filter((o) => (!cls || o.classification === cls) && (!params.cat || o.summary.product.categoryId === params.cat));
  const counts = { high: 0, medium: 0, low: 0 };
  scored.forEach((o) => counts[o.classification!]++);
  const href = (patch: Partial<Params>) => {
    const sp = new URLSearchParams(Object.entries({ class: cls, cat: params.cat, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/opportunities?${sp.toString()}`;
  };
  const calcProducts: CalculatorProduct[] = scored.map((o) => {
    const p = o.summary.product;
    const e = CATEGORY_ECONOMICS[p.categoryId] ?? CATEGORY_ECONOMICS.other;
    const price = o.summary.latest!.price!;
    return { asin: p.asin, title: p.title, price, referralFeePct: e.referralFeePct, closingFee: estimateClosingFee(price), gstRatePct: e.gstRatePct };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip href={href({ class: undefined })} active={!cls}>
          All <span className="tabular opacity-70">{scored.length}</span>
        </FilterChip>
        {(["high", "medium", "low"] as const).map((c) => (
          <FilterChip key={c} href={href({ class: c })} active={cls === c}>
            {CLASS_META[c].label} <span className="tabular opacity-70">{counts[c]}</span>
          </FilterChip>
        ))}
        <form action="/opportunities" className="ml-auto">
          {cls && <input type="hidden" name="class" value={cls} />}
          <label className="sr-only" htmlFor="opp-cat">
            Category
          </label>
          <select
            id="opp-cat"
            name="cat"
            defaultValue={params.cat ?? ""}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit" className="ml-2 h-9 rounded-md border px-3 text-sm">
            Apply
          </button>
        </form>
      </div>

      <ol className="grid gap-3 xl:grid-cols-2">
        {list.slice(0, 20).map((o) => {
          const s = o.summary;
          return (
            <li key={s.product.id}>
              <Card className="h-full p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <ProductThumb product={s.product} size={48} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${s.product.asin}`} className="line-clamp-2 text-sm font-medium leading-snug hover:text-primary">
                      {s.product.title}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {categoryName(s.product.categoryId)} · {formatINR(s.latest?.price)} · est. margin {o.estimatedMarginPct?.toFixed(1)}%
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={CLASS_META[o.classification!].variant}>{CLASS_META[o.classification!].label}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <ScorePill score={o.score} label="Opportunity score" />
                    <WatchButton asin={s.product.asin} />
                  </div>
                </div>
                <p className="mt-3 text-[13px]">{o.explanation}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <details className="group w-full">
                    <summary className="inline-flex cursor-pointer list-none text-xs font-medium text-primary [&::-webkit-details-marker]:hidden">
                      <span className="group-open:hidden">Show all 7 factors</span>
                      <span className="hidden group-open:inline">Hide factors</span>
                    </summary>
                    <div className="mt-3">
                      <ScoreBreakdown components={o.factors} />
                    </div>
                  </details>
                  <Link href={href({ asin: s.product.asin }) + "#calculator"} scroll className="text-xs font-medium text-primary hover:underline">
                    Calculate with my costs →
                  </Link>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
      {list.length > 20 && <p className="text-[13px] text-muted-foreground">Showing the top 20 of {list.length}. Narrow by category to see more.</p>}
      {all.length > scored.length && (
        <p className="text-[13px] text-muted-foreground">{all.length - scored.length} products are excluded because they have fewer than 10 days of snapshots in the last 30 days.</p>
      )}

      <ProfitCalculator key={params.asin ?? "default"} products={calcProducts} initialAsin={params.asin} canSave={canSave} />
    </div>
  );
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium", active ? "border-primary bg-primary text-white" : "bg-white text-muted-foreground hover:text-foreground")}
    >
      {children}
    </Link>
  );
}
