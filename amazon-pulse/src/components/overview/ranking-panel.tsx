"use client";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { CATEGORY_COLORS, categoryName } from "@/lib/categories";
import type { RankRow } from "@/lib/analytics/overview";
import { RankMove } from "@/components/product/rank-move";

type P = "today" | "this_week" | "this_month";

export function RankingPanel({ rankings }: { rankings: Record<P, { label: string; rows: RankRow[] }> }) {
  const [period, setPeriod] = useState<P>("this_week");
  const [n, setN] = useState<"10" | "25" | "50" | "100">("10");
  const rows = rankings[period].rows.slice(0, Number(n));
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Top products by estimated demand</CardTitle>
          <CardDescription>Ranked by average demand index in the period. Arrows show the move from the previous period.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented
            label="Period"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "today", label: "Today" },
              { value: "this_week", label: "Week" },
              { value: "this_month", label: "Month" },
            ]}
          />
          <Segmented
            label="Number of products"
            value={n}
            onChange={setN}
            options={(["10", "25", "50", "100"] as const).map((v) => ({ value: v, label: `Top ${v}` }))}
          />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2 sm:px-0">
        <ol className="max-h-[460px] overflow-y-auto">
          {rows.map((r) => (
            <li key={r.asin}>
              <Link href={`/products/${r.asin}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-5 py-2.5 hover:bg-surface sm:px-6">
                <span className="tabular text-right text-sm font-medium text-muted-foreground">{r.rank}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm">{r.title}</span>
                  <span className="mt-1 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full" style={{ width: `${r.avgDemand}%`, background: CATEGORY_COLORS[r.categoryId] }} />
                    </span>
                    <span className="hidden w-36 truncate text-[11px] text-muted-foreground sm:block">{categoryName(r.categoryId)}</span>
                  </span>
                </span>
                <span className="flex flex-col items-end gap-0.5">
                  <span className="tabular text-sm font-semibold">{r.avgDemand.toFixed(1)}</span>
                  <RankMove rank={r.rank} previousRank={r.previousRank} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
