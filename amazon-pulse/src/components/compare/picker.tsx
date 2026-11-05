"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { actions, MAX_COMPARE, useStore } from "@/lib/client-store";

export function ComparePicker({ selected, options }: { selected: string[]; options: { asin: string; title: string }[] }) {
  const router = useRouter();
  const { compare, hydrated } = useStore();
  const [q, setQ] = useState("");
  // URL is the source of truth on this page; keep the tray in sync with it.
  useEffect(() => {
    if (hydrated && selected.join(",") !== compare.join(",")) actions.setCompare(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, selected.join(",")]);
  const go = (asins: string[]) => router.push(asins.length ? `/compare?asins=${asins.join(",")}` : "/compare", { scroll: false });
  const matches = useMemo(() => {
    if (!q.trim()) return [];
    const w = q.toLowerCase();
    return options.filter((o) => !selected.includes(o.asin) && (o.title.toLowerCase().includes(w) || o.asin.toLowerCase().includes(w))).slice(0, 8);
  }, [q, options, selected]);
  const byAsin = new Map(options.map((o) => [o.asin, o.title]));
  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-2">
        {selected.map((a) => (
          <li key={a} className="inline-flex max-w-full items-center gap-1 rounded-full border bg-white py-1 pl-3 pr-1 text-[13px]">
            <span className="truncate">{byAsin.get(a) ?? a}</span>
            <button type="button" aria-label={`Remove ${byAsin.get(a) ?? a}`} className="grid size-6 place-items-center rounded-full hover:bg-surface" onClick={() => go(selected.filter((x) => x !== a))}>
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {selected.length < MAX_COMPARE ? (
        <div className="relative max-w-md">
          <Input type="search" placeholder={`Add a product (${selected.length}/${MAX_COMPARE})…`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a product to compare" />
          {matches.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border bg-white shadow-lg">
              {matches.map((m) => (
                <li key={m.asin}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-surface"
                    onClick={() => {
                      setQ("");
                      go([...selected, m.asin]);
                    }}
                  >
                    <Plus className="size-3.5 text-muted-foreground" /> <span className="truncate">{m.title}</span>
                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">{m.asin}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">Maximum of {MAX_COMPARE} products. Remove one to add another.</p>
      )}
      {selected.length > 0 && (
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => go([])}>
          Clear all
        </Button>
      )}
    </div>
  );
}
