import Link from "next/link";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Sparkline } from "@/components/charts/sparkline";
import { ProductThumb } from "@/components/product/product-thumb";
import { DemandBadge, TrendBadge } from "@/components/product/badges";
import { CompareToggle, WatchButton } from "@/components/product/product-actions";
import { categoryName } from "@/lib/categories";
import { formatDayShort } from "@/lib/dates";
import { formatCompact, formatINR, formatInt } from "@/lib/format";
import type { ProductSummary } from "@/lib/analytics/engine";

function BsrMove({ s }: { s: ProductSummary }) {
  const d = s.rankChange7d;
  if (d == null || s.latest?.bsr == null) return <span className="text-subtle-foreground">—</span>;
  return (
    <span className="flex flex-col">
      <span className="tabular">#{formatInt(s.latest.bsr)}</span>
      <span className={`tabular text-[11px] ${d > 0 ? "text-positive" : d < 0 ? "text-negative" : "text-muted-foreground"}`}>
        {d > 0 ? "▲" : d < 0 ? "▼" : "•"} {formatInt(Math.abs(d))} <span className="text-muted-foreground">7d</span>
      </span>
    </span>
  );
}

function Price({ s }: { s: ProductSummary }) {
  return (
    <span className="flex flex-col">
      <span className="tabular font-medium">{formatINR(s.latest?.price)}</span>
      <span className="tabular text-[11px] text-muted-foreground">
        {s.previousPrice != null && s.previousPrice !== s.latest?.price ? <>was {formatINR(s.previousPrice)}</> : s.discountPct ? <>{s.discountPct}% off list</> : " "}
      </span>
    </span>
  );
}

export function ResultsTable({ rows }: { rows: ProductSummary[] }) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <THead>
          <tr>
            <TH>Product</TH>
            <TH className="text-right">Price</TH>
            <TH className="text-right">Discount</TH>
            <TH className="text-right">BSR</TH>
            <TH>Rating</TH>
            <TH>Demand</TH>
            <TH>30-day demand</TH>
            <TH>Trend</TH>
            <TH>Updated</TH>
            <TH>
              <span className="sr-only">Actions</span>
            </TH>
          </tr>
        </THead>
        <TBody>
          {rows.map((s) => (
            <TR key={s.product.id}>
              <TD className="min-w-[280px] max-w-[360px]">
                <Link href={`/products/${s.product.asin}`} className="flex items-center gap-3">
                  <ProductThumb product={s.product} />
                  <span className="min-w-0">
                    <span className="line-clamp-2 font-medium leading-snug hover:text-primary">{s.product.title}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      <span className="font-mono">{s.product.asin}</span> · {categoryName(s.product.categoryId)} › {s.product.subcategory}
                    </span>
                  </span>
                </Link>
              </TD>
              <TD className="text-right">
                <Price s={s} />
              </TD>
              <TD className="tabular text-right">{s.discountPct != null ? `${s.discountPct}%` : "—"}</TD>
              <TD className="text-right">
                <BsrMove s={s} />
              </TD>
              <TD>
                {s.latest?.rating != null ? (
                  <span className="flex flex-col">
                    <span className="tabular inline-flex items-center gap-1">
                      <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
                      {s.latest.rating.toFixed(1)}
                    </span>
                    <span className="tabular text-[11px] text-muted-foreground">{formatCompact(s.latest.reviewCount)} reviews</span>
                  </span>
                ) : (
                  "—"
                )}
              </TD>
              <TD>
                <DemandBadge level={s.demandLevel} value={s.demand} />
              </TD>
              <TD className="w-28">
                <Sparkline data={s.sparkline} height={28} label={`${s.product.title} demand, last 30 days`} />
              </TD>
              <TD>
                <TrendBadge direction={s.trend.direction} />
              </TD>
              <TD className="whitespace-nowrap text-[13px] text-muted-foreground">{s.lastUpdated ? formatDayShort(s.lastUpdated) : "—"}</TD>
              <TD>
                <span className="flex">
                  <WatchButton asin={s.product.asin} />
                  <CompareToggle asin={s.product.asin} />
                </span>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </Card>
  );
}

export function ResultsCards({ rows, className }: { rows: ProductSummary[]; className?: string }) {
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 2xl:grid-cols-3 ${className ?? ""}`}>
      {rows.map((s) => (
        <li key={s.product.id}>
          <Card className="relative flex h-full flex-col p-4 transition-shadow hover:shadow-md">
            <div className="flex items-start gap-3">
              <ProductThumb product={s.product} size={56} />
              <div className="min-w-0 flex-1">
                <Link href={`/products/${s.product.asin}`} className="line-clamp-2 text-sm font-medium leading-snug after:absolute after:inset-0 hover:text-primary">
                  {s.product.title}
                </Link>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  <span className="font-mono">{s.product.asin}</span> · {categoryName(s.product.categoryId)}
                </p>
              </div>
              <span className="relative z-10 -mr-2 -mt-1 flex">
                <WatchButton asin={s.product.asin} />
                <CompareToggle asin={s.product.asin} />
              </span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <DemandBadge level={s.demandLevel} value={s.demand} />
              <TrendBadge direction={s.trend.direction} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Price</dt>
                <dd className="tabular mt-0.5 font-medium">{formatINR(s.latest?.price)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">BSR</dt>
                <dd className="tabular mt-0.5 font-medium">{s.latest?.bsr != null ? `#${formatInt(s.latest.bsr)}` : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rating</dt>
                <dd className="tabular mt-0.5 font-medium">
                  {s.latest?.rating != null ? `${s.latest.rating.toFixed(1)}★` : "—"}{" "}
                  <span className="font-normal text-muted-foreground">({formatCompact(s.latest?.reviewCount)})</span>
                </dd>
              </div>
            </dl>
            <div className="mt-auto pt-3">
              <Sparkline data={s.sparkline} height={32} label={`${s.product.title} demand, last 30 days`} />
              <p className="mt-1 text-[11px] text-subtle-foreground">Demand index, last 30 days · updated {s.lastUpdated ? formatDayShort(s.lastUpdated) : "—"}</p>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
