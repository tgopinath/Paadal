import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Change indicator. Direction is carried by the arrow and sign, not colour
 * alone. `inverse` flips good/bad (e.g. BSR: lower is better).
 */
export function Delta({
  value,
  suffix = "%",
  digits = 1,
  inverse = false,
  className,
  neutralBelow = 0.05,
}: {
  value: number | null;
  suffix?: string;
  digits?: number;
  inverse?: boolean;
  className?: string;
  neutralBelow?: number;
}) {
  if (value == null || !Number.isFinite(value)) {
    return <span className={cn("text-xs text-subtle-foreground", className)}>No comparison</span>;
  }
  const flat = Math.abs(value) < neutralBelow;
  const good = inverse ? value < 0 : value > 0;
  const Icon = flat ? ArrowRight : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 text-xs font-medium",
        flat ? "text-muted-foreground" : good ? "text-positive" : "text-negative",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {value > 0 ? "+" : ""}
      {value.toFixed(digits)}
      {suffix}
    </span>
  );
}
