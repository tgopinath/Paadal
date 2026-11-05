"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeSeriesChart } from "@/components/charts/time-series";
import { Legend, PREVIOUS, PRIMARY } from "@/components/charts/kit";

export function MovementChart({
  title,
  description,
  rows,
  currentLabel,
  previousLabel,
  fmt,
}: {
  title: string;
  description: string;
  rows: { label: string; current: number | null; previous: number | null }[];
  currentLabel: string;
  previousLabel: string;
  fmt: "index" | "inr";
}) {
  const formatter = fmt === "inr" ? (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}` : (v: number) => v.toFixed(1);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Legend
          items={[
            { label: currentLabel, color: PRIMARY },
            { label: previousLabel, color: PREVIOUS, dashed: true },
          ]}
        />
      </CardHeader>
      <CardContent>
        <TimeSeriesChart
          rows={rows}
          kind={rows.length <= 2 ? "bar" : "line"}
          series={[
            { key: "current", name: currentLabel, color: PRIMARY },
            { key: "previous", name: previousLabel, color: PREVIOUS, dashed: true },
          ]}
          formatter={formatter}
          height={240}
          ariaLabel={`${title}: ${currentLabel} vs ${previousLabel}`}
        />
      </CardContent>
    </Card>
  );
}
