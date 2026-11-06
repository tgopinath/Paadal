import Link from "next/link";
import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Delta } from "@/components/common/delta";
import { Sparkline } from "@/components/charts/sparkline";
import { InfoTip } from "@/components/ui/tooltip";
import type { Kpi } from "@/lib/analytics/overview";

export function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <Card className="flex min-w-0 flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[13px] font-medium text-muted-foreground">{kpi.label}</p>
        <InfoTip content={kpi.help}>
          <button type="button" aria-label={`About ${kpi.label}`} className="-m-1.5 rounded p-1.5 text-subtle-foreground hover:text-foreground">
            <Info className="size-3.5" />
          </button>
        </InfoTip>
      </div>
      <p className="tabular mt-2 text-2xl font-semibold tracking-tight">{kpi.value}</p>
      {kpi.subject ? (
        kpi.subject.href ? (
          <Link href={kpi.subject.href} className="mt-0.5 line-clamp-1 text-[13px] text-foreground hover:text-primary hover:underline">
            {kpi.subject.label}
          </Link>
        ) : (
          <p className="mt-0.5 line-clamp-1 text-[13px]">{kpi.subject.label}</p>
        )
      ) : (
        <p className="mt-0.5 text-[13px] text-transparent" aria-hidden>
          ·
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <Delta value={kpi.changePct} />
        <span className="truncate text-[11px] text-subtle-foreground">
          {kpi.previousLabel}: <span className="tabular">{kpi.previousValue}</span>
        </span>
      </div>
      <div className="mt-2">
        <Sparkline data={kpi.spark} label={`${kpi.label}, last 30 days`} />
      </div>
    </Card>
  );
}
