"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, NativeSelect } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";

type Kind = "day" | "week" | "month" | "year" | "custom";

const KIND_OF: Record<string, Kind> = {
  today: "day",
  yesterday: "day",
  day: "day",
  this_week: "week",
  last_week: "week",
  week: "week",
  this_month: "month",
  last_month: "month",
  month: "month",
  this_year: "year",
  last_year: "year",
  year: "year",
  custom: "custom",
};

const QUICK: Record<Exclude<Kind, "custom">, [string, string][]> = {
  day: [
    ["today", "Today"],
    ["yesterday", "Yesterday"],
  ],
  week: [
    ["this_week", "This week"],
    ["last_week", "Last week"],
  ],
  month: [
    ["this_month", "This month"],
    ["last_month", "Last month"],
  ],
  year: [
    ["this_year", "This year"],
    ["last_year", "Last year"],
  ],
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function PeriodPicker({ today, firstYear }: { today: string; firstYear: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const preset = sp.get("p") ?? "this_week";
  const [kind, setKind] = useState<Kind>(KIND_OF[preset] ?? "week");
  const [from, setFrom] = useState(sp.get("from") ?? "");
  const [to, setTo] = useState(sp.get("to") ?? "");
  const thisYear = Number(today.slice(0, 4));
  const years = Array.from({ length: thisYear - firstYear + 2 }, (_, i) => thisYear - i);
  const go = (params: Record<string, string>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) next.set(k, v);
    const top = sp.get("top");
    if (top) next.set("top", top);
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const selMonth = sp.get("m") ?? today.slice(0, 7);

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border bg-surface/60 p-3 sm:p-4", pending && "opacity-70")} aria-busy={pending}>
      <Segmented
        label="Period type"
        value={kind}
        onChange={setKind}
        className="self-start"
        options={[
          { value: "day", label: "Daily" },
          { value: "week", label: "Weekly" },
          { value: "month", label: "Monthly" },
          { value: "year", label: "Yearly" },
          { value: "custom", label: "Custom" },
        ]}
      />
      <div className="flex flex-wrap items-end gap-2">
        {kind !== "custom" &&
          QUICK[kind].map(([p, l]) => (
            <Button key={p} size="sm" variant={preset === p ? "default" : "outline"} aria-pressed={preset === p} onClick={() => go({ p })}>
              {l}
            </Button>
          ))}
        {kind === "day" && (
          <div className="grid gap-1">
            <Label htmlFor="pp-day" className="text-xs text-muted-foreground">
              Any date
            </Label>
            <Input id="pp-day" type="date" max={today} className="h-8 w-44" value={preset === "day" ? (sp.get("d") ?? "") : ""} onChange={(e) => e.target.value && go({ p: "day", d: e.target.value })} />
          </div>
        )}
        {kind === "week" && (
          <div className="grid gap-1">
            <Label htmlFor="pp-week" className="text-xs text-muted-foreground">
              Week containing
            </Label>
            <Input id="pp-week" type="date" max={today} className="h-8 w-44" value={preset === "week" ? (sp.get("d") ?? "") : ""} onChange={(e) => e.target.value && go({ p: "week", d: e.target.value })} />
          </div>
        )}
        {kind === "month" && (
          <div className="flex items-end gap-2">
            <div className="grid gap-1">
              <Label htmlFor="pp-m" className="text-xs text-muted-foreground">
                Month
              </Label>
              <NativeSelect id="pp-m" className="h-8 w-24" value={selMonth.slice(5, 7)} onChange={(e) => go({ p: "month", m: `${selMonth.slice(0, 4)}-${e.target.value}` })}>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1).padStart(2, "0")}>
                    {m}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="pp-my" className="text-xs text-muted-foreground">
                Year
              </Label>
              <NativeSelect id="pp-my" className="h-8 w-24" value={selMonth.slice(0, 4)} onChange={(e) => go({ p: "month", m: `${e.target.value}-${selMonth.slice(5, 7)}` })}>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </NativeSelect>
            </div>
          </div>
        )}
        {kind === "year" && (
          <div className="grid gap-1">
            <Label htmlFor="pp-y" className="text-xs text-muted-foreground">
              Any year
            </Label>
            <NativeSelect id="pp-y" className="h-8 w-28" value={preset === "year" ? (sp.get("y") ?? "") : ""} onChange={(e) => e.target.value && go({ p: "year", y: e.target.value })}>
              <option value="">Choose…</option>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </NativeSelect>
          </div>
        )}
        {kind === "custom" && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (from && to) go({ p: "custom", from, to });
            }}
          >
            <div className="grid gap-1">
              <Label htmlFor="pp-from" className="text-xs text-muted-foreground">
                Start date
              </Label>
              <Input id="pp-from" type="date" max={today} className="h-8 w-44" value={from} onChange={(e) => setFrom(e.target.value)} required />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="pp-to" className="text-xs text-muted-foreground">
                End date
              </Label>
              <Input id="pp-to" type="date" max={today} min={from || undefined} className="h-8 w-44" value={to} onChange={(e) => setTo(e.target.value)} required />
            </div>
            <Button size="sm" type="submit">
              Apply
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
