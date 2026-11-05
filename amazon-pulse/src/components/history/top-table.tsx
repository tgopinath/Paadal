"use client";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { RankMove } from "@/components/product/rank-move";
import { categoryName } from "@/lib/categories";

export interface TopRow {
  rank: number;
  previousRank: number | null;
  asin: string;
  title: string;
  categoryId: string;
  avgDemand: number;
  avgBsr: number | null;
  bestBsr: number | null;
  endPrice: number | null;
  priceChangePct: number | null;
  reviewsGained: number | null;
  observations: number;
}

export function TopTable({ rows, periodLabel, compareLabel }: { rows: TopRow[]; periodLabel: string; compareLabel: string }) {
  const [n, setN] = useState<"10" | "25" | "50">("10");
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div>
          <CardTitle>Top products · {periodLabel}</CardTitle>
          <CardDescription>Ranked by average demand index over the days with snapshots. Movement is versus {compareLabel.toLowerCase()}.</CardDescription>
        </div>
        <Segmented label="Number of products" value={n} onChange={setN} options={(["10", "25", "50"] as const).map((v) => ({ value: v, label: `Top ${v}` }))} />
      </CardHeader>
      <CardContent className="px-0 pb-0 sm:px-0">
        <Table>
          <THead>
            <tr>
              <TH className="w-12 text-right">#</TH>
              <TH>Product</TH>
              <TH className="text-right">Avg demand</TH>
              <TH className="text-right">Avg BSR</TH>
              <TH className="text-right">Best BSR</TH>
              <TH className="text-right">Price (end)</TH>
              <TH className="text-right">Price Δ</TH>
              <TH className="text-right">New reviews</TH>
              <TH className="text-right">Days</TH>
            </tr>
          </THead>
          <TBody>
            {rows.slice(0, Number(n)).map((r) => (
              <TR key={r.asin}>
                <TD className="text-right">
                  <span className="flex flex-col items-end">
                    <span className="tabular font-medium">{r.rank}</span>
                    <RankMove rank={r.rank} previousRank={r.previousRank} />
                  </span>
                </TD>
                <TD className="min-w-[240px]">
                  <Link href={`/products/${r.asin}`} className="line-clamp-1 font-medium hover:text-primary">
                    {r.title}
                  </Link>
                  <span className="text-[11px] text-muted-foreground">
                    <span className="font-mono">{r.asin}</span> · {categoryName(r.categoryId)}
                  </span>
                </TD>
                <TD className="tabular text-right font-medium">{r.avgDemand.toFixed(1)}</TD>
                <TD className="tabular text-right">{r.avgBsr != null ? `#${r.avgBsr.toLocaleString("en-IN")}` : "—"}</TD>
                <TD className="tabular text-right">{r.bestBsr != null ? `#${r.bestBsr.toLocaleString("en-IN")}` : "—"}</TD>
                <TD className="tabular text-right">{r.endPrice != null ? `₹${r.endPrice.toLocaleString("en-IN")}` : "—"}</TD>
                <TD className={`tabular text-right ${r.priceChangePct == null || Math.abs(r.priceChangePct) < 0.5 ? "text-muted-foreground" : r.priceChangePct < 0 ? "text-positive" : "text-negative"}`}>
                  {r.priceChangePct == null ? "—" : `${r.priceChangePct > 0 ? "+" : ""}${r.priceChangePct.toFixed(1)}%`}
                </TD>
                <TD className="tabular text-right">{r.reviewsGained?.toLocaleString("en-IN") ?? "—"}</TD>
                <TD className="tabular text-right text-muted-foreground">{r.observations}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}
