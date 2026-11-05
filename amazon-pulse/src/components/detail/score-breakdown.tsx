import type { ScoreComponent } from "@/lib/analytics/engine";

export function ScoreBreakdown({ components }: { components: ScoreComponent[] }) {
  return (
    <ul className="space-y-3">
      {components.map((c) => (
        <li key={c.key}>
          <div className="flex items-baseline justify-between gap-2 text-[13px]">
            <span className="font-medium">
              {c.label} <span className="font-normal text-muted-foreground">· {Math.round(c.weight * 100)}%</span>
            </span>
            <span className="tabular font-medium">{c.score}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-primary" style={{ width: `${c.score}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{c.detail}</p>
        </li>
      ))}
    </ul>
  );
}
