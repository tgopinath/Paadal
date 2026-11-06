"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { AXIS_TICK, ChartTooltip, DOWN, GRID_STROKE, UP } from "@/components/charts/kit";
import { CATEGORY_COLORS } from "@/lib/categories";
import type { CategoryRow } from "@/lib/analytics/overview";

type Metric = "avgDemand" | "topShare" | "change";

const META: Record<Metric, { label: string; desc: string; fmt: (v: number) => string }> = {
  avgDemand: { label: "Demand", desc: "Average demand index of products in the category", fmt: (v) => v.toFixed(1) },
  topShare: { label: "Top-50 share", desc: "Share of the top 50 ranking slots held by the category", fmt: (v) => `${Math.round(v * 100)}%` },
  change: { label: "Change", desc: "Change in average demand index vs the comparison period (points)", fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}` },
};

export function CategoryPanel({ rows, periodLabel, compareLabel }: { rows: CategoryRow[]; periodLabel: string; compareLabel: string }) {
  const [metric, setMetric] = useState<Metric>("avgDemand");
  const data = [...rows]
    .map((r) => ({ name: r.name, id: r.categoryId, value: r[metric] }))
    .filter((r) => r.value != null)
    .sort((a, b) => (b.value as number) - (a.value as number));
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Category performance</CardTitle>
          <CardDescription>
            {META[metric].desc} · {periodLabel}
            {metric === "change" ? ` vs ${compareLabel.toLowerCase()}` : ""}
          </CardDescription>
        </div>
        <Segmented
          label="Metric"
          value={metric}
          onChange={setMetric}
          options={(Object.keys(META) as Metric[]).map((m) => ({ value: m, label: META[m].label }))}
        />
      </CardHeader>
      <CardContent>
        <div style={{ height: Math.max(220, data.length * 34) }} role="img" aria-label={`Category ${META[metric].label}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
              <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
              <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={META[metric].fmt} domain={metric === "change" ? ["auto", "auto"] : [0, "auto"]} />
              <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fill: "#1f2328" }} tickLine={false} axisLine={false} width={150} />
              {metric === "change" && <ReferenceLine x={0} stroke="#9ca3af" />}
              <Tooltip cursor={{ fill: "#f3f4f6" }} content={(p) => <ChartTooltip {...(p as object)} fmt={META[metric].fmt} />} />
              <Bar dataKey="value" name={META[metric].label} radius={4} maxBarSize={20} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.id} fill={metric === "change" ? ((d.value as number) >= 0 ? UP : DOWN) : CATEGORY_COLORS[d.id]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
