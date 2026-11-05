"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { TimeSeriesChart } from "@/components/charts/time-series";
import type { SeriesPoint } from "@/lib/analytics/engine";

export type Metric = "demand" | "bsr" | "price" | "reviews";
export type Window = "day" | "week" | "month" | "year";

const METRIC: Record<Metric, { label: string; desc: string; fmt: (v: number) => string; reversed?: boolean }> = {
  demand: { label: "Demand", desc: "Estimated demand index (0–100, from BSR)", fmt: (v) => v.toFixed(0) },
  bsr: { label: "BSR", desc: "Best Sellers Rank — lower is better, axis inverted", fmt: (v) => `#${Math.round(v).toLocaleString("en-IN")}`, reversed: true },
  price: { label: "Price", desc: "Listed price, GST inclusive", fmt: (v) => `₹${Math.round(v).toLocaleString("en-IN")}` },
  reviews: { label: "Reviews", desc: "Cumulative review count", fmt: (v) => Math.round(v).toLocaleString("en-IN") },
};

const WINDOW: Record<Window, string> = {
  day: "Daily · last 30 days",
  week: "Weekly · last 12 weeks",
  month: "Monthly · last 12 months",
  year: "Yearly · all years with data",
};

export function HistoryCharts({ data }: { data: Record<Window, Record<Metric, SeriesPoint[]>> }) {
  const [w, setW] = useState<Window>("day");
  const [m, setM] = useState<Metric>("demand");
  const points = data[w][m];
  const hasData = points.some((p) => p.value != null);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Performance history</CardTitle>
          <CardDescription>
            {METRIC[m].desc} · {WINDOW[w]}
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Segmented
            label="Window"
            value={w}
            onChange={setW}
            options={[
              { value: "day", label: "30 days" },
              { value: "week", label: "12 weeks" },
              { value: "month", label: "12 months" },
              { value: "year", label: "Years" },
            ]}
          />
          <Segmented label="Metric" value={m} onChange={setM} options={(Object.keys(METRIC) as Metric[]).map((k) => ({ value: k, label: METRIC[k].label }))} />
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <TimeSeriesChart
            rows={points.map((p) => ({ label: p.label, v: p.value }))}
            series={[{ key: "v", name: METRIC[m].label }]}
            kind={w === "year" ? "bar" : m === "bsr" || m === "price" ? "line" : "area"}
            formatter={METRIC[m].fmt}
            reversed={METRIC[m].reversed}
            domain={m === "bsr" || m === "price" || m === "reviews" ? ["auto", "auto"] : undefined}
            ariaLabel={`${METRIC[m].label}, ${WINDOW[w]}`}
          />
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">Historical data not available for this window.</p>
        )}
        {w === "year" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Yearly values average the days with snapshots: {points.map((p) => `${p.label}: ${p.covered} of ${p.days} days`).join(" · ")}.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
