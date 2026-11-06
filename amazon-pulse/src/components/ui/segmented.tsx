"use client";
import { cn } from "@/lib/utils";

/** Compact single-choice control (chart type, top-N, granularity). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; title?: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex h-8 items-center gap-0.5 rounded-md bg-surface-2 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex h-7 min-w-7 items-center justify-center rounded-[6px] px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-3.5",
            value === o.value && "bg-white text-foreground shadow-sm",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
