"use client";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { PRIMARY } from "./kit";

export function Sparkline({ data, color = PRIMARY, height = 36, label }: { data: (number | null)[]; color?: string; height?: number; label: string }) {
  const points = data.map((v, i) => ({ i, v }));
  const hasData = data.some((v) => v != null);
  if (!hasData) return <div style={{ height }} className="grid place-items-center text-[11px] text-subtle-foreground">No trend data</div>;
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} dot={false} isAnimationActive={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
