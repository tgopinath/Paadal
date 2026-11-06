import { TrendingDown, TrendingUp, MoveRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DEMAND_LEVEL_LABEL } from "@/lib/analytics/demand";
import type { DemandLevel, TrendDirection } from "@/lib/types";

export function DemandBadge({ level, value }: { level: DemandLevel | null; value?: number | null }) {
  if (!level) return <Badge variant="outline">No data</Badge>;
  const variant = level === "very_high" || level === "high" ? "default" : "neutral";
  return (
    <Badge variant={variant} title="Estimated demand index (0–100), derived from Best Sellers Rank. Not unit sales.">
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-2.5 w-1 rounded-full"
            style={{ background: i < { low: 1, medium: 2, high: 3, very_high: 4 }[level] ? "currentColor" : "color-mix(in srgb, currentColor 25%, transparent)" }}
          />
        ))}
      </span>
      {DEMAND_LEVEL_LABEL[level]}
      {value != null && <span className="tabular opacity-70">· {value.toFixed(0)}</span>}
    </Badge>
  );
}

export function TrendBadge({ direction, label }: { direction: TrendDirection; label?: string }) {
  if (direction === "up")
    return (
      <Badge variant="positive">
        <TrendingUp aria-hidden /> {label ?? "Rising"}
      </Badge>
    );
  if (direction === "down")
    return (
      <Badge variant="negative">
        <TrendingDown aria-hidden /> {label ?? "Falling"}
      </Badge>
    );
  return (
    <Badge variant="neutral">
      <MoveRight aria-hidden /> {label ?? "Stable"}
    </Badge>
  );
}

export function ScorePill({ score, label }: { score: number | null; label: string }) {
  if (score == null) return <Badge variant="outline">Not enough data</Badge>;
  const variant = score >= 70 ? "positive" : score >= 45 ? "default" : "neutral";
  return (
    <Badge variant={variant} className="tabular" title={label}>
      {score}
      <span className="opacity-60">/100</span>
    </Badge>
  );
}
