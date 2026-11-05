"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Delta } from "@/components/common/delta";
import { AXIS_TICK, ChartTooltip, DOWN, GRID_STROKE, UP } from "@/components/charts/kit";
import type { ComparisonBlock } from "@/lib/analytics/overview";
import { formatRange } from "@/lib/dates";
import { formatINR } from "@/lib/format";

export function ComparisonPanel({ blocks }: { blocks: ComparisonBlock[] }) {
  const [key, setKey] = useState(blocks[1]?.key ?? blocks[0].key);
  const b = blocks.find((x) => x.key === key)!;
  const data = b.byCategory.filter((c) => c.delta != null).sort((x, y) => y.delta! - x.delta!);
  const pct = (a: number | null, p: number | null) => (a != null && p != null && p !== 0 ? ((a - p) / p) * 100 : null);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Historical comparison</CardTitle>
          <CardDescription>
            {b.currentLabel} ({formatRange(b.current.start, b.current.end)}) vs {b.previousLabel.toLowerCase()} ({formatRange(b.previous.start, b.previous.end)})
          </CardDescription>
        </div>
        <Segmented
          label="Comparison"
          value={key}
          onChange={setKey}
          options={blocks.map((x) => ({ value: x.key, label: x.label.split(" vs ")[0], title: x.label }))}
        />
      </CardHeader>
      <CardContent>
        {!b.hasPrevious ? (
          <p className="rounded-md bg-surface px-4 py-6 text-center text-sm text-muted-foreground">
            Historical data not available for {b.previousLabel.toLowerCase()} — no snapshots were collected then, so there is nothing to compare against.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_1fr]">
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <Stat label="Avg demand index" value={b.avgDemand?.toFixed(1) ?? "—"} prev={b.prevAvgDemand?.toFixed(1) ?? "—"} delta={pct(b.avgDemand, b.prevAvgDemand)} />
              <Stat label="Avg selling price" value={formatINR(b.avgPrice)} prev={formatINR(b.prevAvgPrice)} delta={pct(b.avgPrice, b.prevAvgPrice)} />
              <div className="col-span-2 rounded-md bg-surface p-3 lg:col-span-1">
                <dt className="text-xs text-muted-foreground">Products moving (±2 pts)</dt>
                <dd className="mt-1 flex gap-4 text-sm">
                  <span className="text-positive">▲ {b.risers} rising</span>
                  <span className="text-negative">▼ {b.fallers} falling</span>
                </dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 text-xs text-muted-foreground">Change in average demand index by category (points)</p>
              <div style={{ height: Math.max(200, data.length * 30) }} role="img" aria-label="Demand change by category">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
                    <CartesianGrid horizontal={false} stroke={GRID_STROKE} />
                    <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} />
                    <YAxis type="category" dataKey="name" tick={{ ...AXIS_TICK, fill: "#1f2328" }} tickLine={false} axisLine={false} width={150} />
                    <ReferenceLine x={0} stroke="#9ca3af" />
                    <Tooltip cursor={{ fill: "#f3f4f6" }} content={(p) => <ChartTooltip {...(p as object)} fmt={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)} pts`} />} />
                    <Bar dataKey="delta" name="Change" radius={4} maxBarSize={18} isAnimationActive={false}>
                      {data.map((d) => (
                        <Cell key={d.categoryId} fill={d.delta! >= 0 ? UP : DOWN} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, prev, delta }: { label: string; value: string; prev: string; delta: number | null }) {
  return (
    <div className="rounded-md bg-surface p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1">
        <span className="tabular text-lg font-semibold">{value}</span>
        <span className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="tabular">was {prev}</span>
          <Delta value={delta} />
        </span>
      </dd>
    </div>
  );
}
