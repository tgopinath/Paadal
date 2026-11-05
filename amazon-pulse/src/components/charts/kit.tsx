"use client";
import type { TooltipContentProps } from "recharts";

export const AXIS_TICK = { fontSize: 11, fill: "#6b7280" } as const;
export const GRID_STROKE = "#eef0f3";
export const PRIMARY = "#2563eb";
export const PREVIOUS = "#b8bcc4";
export const UP = "#2563eb";
export const DOWN = "#eb6834";

export type ValueFormatter = (v: number) => string;

/** Shared tooltip: values in text ink, a colour chip carries identity. */
export function ChartTooltip({
  active,
  payload,
  label,
  fmt,
  labelFormatter,
}: Partial<Omit<TooltipContentProps<number, string>, "formatter" | "labelFormatter">> & { fmt?: ValueFormatter; labelFormatter?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-36 rounded-md border bg-white px-3 py-2 text-xs shadow-lg">
      {label != null && <p className="mb-1.5 font-medium text-foreground">{labelFormatter ? labelFormatter(String(label)) : String(label)}</p>}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: (p.color as string) ?? PRIMARY }} />
              {p.name}
            </span>
            <span className="tabular font-medium text-foreground">
              {p.value == null ? "No data" : fmt ? fmt(Number(p.value)) : String(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: i.dashed ? `repeating-linear-gradient(90deg, ${i.color} 0 4px, transparent 4px 7px)` : i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
