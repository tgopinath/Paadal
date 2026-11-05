"use client";
import { useState } from "react";
import { AreaChart as AreaIcon, BarChart3, LineChart as LineIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { TimeSeriesChart, type ChartKind } from "@/components/charts/time-series";
import type { SeriesPoint } from "@/lib/analytics/engine";
import type { Granularity } from "@/lib/types";

const G_LABEL: Record<Granularity, string> = { day: "Daily", week: "Weekly", month: "Monthly", year: "Yearly" };
const G_DESC: Record<Granularity, string> = {
  day: "Last 30 days",
  week: "Last 12 weeks",
  month: "Last 12 months",
  year: "All years with data",
};

export function DemandPanel({ series }: { series: Record<Granularity, SeriesPoint[]> }) {
  const [g, setG] = useState<Granularity>("day");
  const [kind, setKind] = useState<ChartKind>("area");
  const points = series[g];
  const gaps = points.filter((p) => p.covered < p.days).length;
  const rows = points.map((p) => ({ label: p.label, demand: p.value }));
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Product demand over time</CardTitle>
          <CardDescription>
            Average estimated demand index across all tracked products · {G_DESC[g]}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented
            label="Granularity"
            value={g}
            onChange={setG}
            options={(Object.keys(G_LABEL) as Granularity[]).map((k) => ({ value: k, label: G_LABEL[k] }))}
          />
          <Segmented
            label="Chart type"
            value={kind}
            onChange={setKind}
            options={[
              { value: "area", label: <AreaIcon />, title: "Area" },
              { value: "line", label: <LineIcon />, title: "Line" },
              { value: "bar", label: <BarChart3 />, title: "Bar" },
            ]}
          />
        </div>
      </CardHeader>
      <CardContent>
        <TimeSeriesChart rows={rows} series={[{ key: "demand", name: "Avg demand index" }]} kind={kind} ariaLabel={`Demand index, ${G_DESC[g]}`} />
        {gaps > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {gaps} {gaps === 1 ? "bucket has" : "buckets have"} incomplete snapshot coverage; values average the days that were collected.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
