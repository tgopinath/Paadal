"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { TimeSeriesChart } from "@/components/charts/time-series";
import { Legend } from "@/components/charts/kit";

type M = "demand" | "bsr" | "price";
// First five slots of the validated categorical palette.
export const COMPARE_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

export function CompareChart({ series, names }: { series: Record<M, Record<string, string | number | null>[]>; names: string[] }) {
  const [m, setM] = useState<M>("demand");
  const fmt: Record<M, (v: number) => string> = {
    demand: (v) => v.toFixed(0),
    bsr: (v) => `#${Math.round(v).toLocaleString("en-IN")}`,
    price: (v) => `₹${Math.round(v).toLocaleString("en-IN")}`,
  };
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Historical performance · last 90 days</CardTitle>
          <CardDescription>{m === "bsr" ? "Best Sellers Rank (lower is better, axis inverted). Ranks are only comparable within a category." : m === "price" ? "Listed price" : "Estimated demand index"}</CardDescription>
        </div>
        <Segmented
          label="Metric"
          value={m}
          onChange={setM}
          options={[
            { value: "demand", label: "Demand" },
            { value: "bsr", label: "BSR" },
            { value: "price", label: "Price" },
          ]}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <Legend items={names.map((n, i) => ({ label: n, color: COMPARE_COLORS[i] }))} />
        <TimeSeriesChart
          rows={series[m]}
          series={names.map((n, i) => ({ key: `p${i}`, name: n, color: COMPARE_COLORS[i] }))}
          kind="line"
          formatter={fmt[m]}
          reversed={m === "bsr"}
          height={300}
          ariaLabel={`Comparison of ${m}`}
        />
      </CardContent>
    </Card>
  );
}
