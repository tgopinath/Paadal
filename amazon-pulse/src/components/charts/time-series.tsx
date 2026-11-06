"use client";
import { useId } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, ChartTooltip, GRID_STROKE, PRIMARY, type ValueFormatter } from "./kit";

export type ChartKind = "area" | "line" | "bar";

export interface TSSeries {
  key: string;
  name: string;
  color?: string;
  dashed?: boolean;
}

/**
 * Time series with one shared y-axis. Rows are { label, [seriesKey]: value|null }.
 * Nulls are drawn as gaps, never as zero.
 */
export function TimeSeriesChart({
  rows,
  series,
  kind = "area",
  height = 280,
  formatter = (v) => v.toFixed(1),
  domain,
  ariaLabel,
  reversed = false,
}: {
  rows: Record<string, string | number | null>[];
  series: TSSeries[];
  kind?: ChartKind;
  height?: number;
  formatter?: ValueFormatter;
  domain?: [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax"];
  ariaLabel: string;
  /** For ranks: smaller is better, so draw the axis upside-down. */
  reversed?: boolean;
}) {
  const gid = useId().replace(/:/g, "");
  const common = {
    data: rows,
    margin: { top: 8, right: 8, bottom: 0, left: -12 },
  };
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={GRID_STROKE} />
      <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={24} interval="preserveStartEnd" />
      <YAxis
        tick={AXIS_TICK}
        tickLine={false}
        axisLine={false}
        width={56}
        domain={domain ?? (kind === "line" ? ["auto", "auto"] : [0, "auto"])}
        reversed={reversed}
        tickFormatter={(v: number) => formatter(v)}
      />
      <Tooltip
        cursor={kind === "bar" ? { fill: "#f3f4f6" } : { stroke: "#9ca3af", strokeWidth: 1 }}
        content={(p) => <ChartTooltip {...(p as object)} fmt={formatter} />}
      />
    </>
  );

  return (
    <div style={{ height }} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "bar" ? (
          <BarChart {...common} barCategoryGap="20%" barGap={2}>
            {axes}
            {series.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color ?? PRIMARY} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            ))}
          </BarChart>
        ) : kind === "line" ? (
          <LineChart {...common}>
            {axes}
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color ?? PRIMARY}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        ) : (
          <AreaChart {...common}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`${gid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color ?? PRIMARY} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={s.color ?? PRIMARY} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {axes}
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color ?? PRIMARY}
                strokeWidth={2}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                fill={s.dashed ? "transparent" : `url(#${gid}-${s.key})`}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
