"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUp, Bot, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Answer {
  summary: string;
  metrics: { label: string; value: string }[];
  products: { asin: string; title: string; note: string }[];
  period: string;
  data_freshness: string;
  limitations: string[];
}
interface Turn {
  question: string;
  answer?: Answer;
  error?: string;
}

export function Assistant({ enabled, examples }: { enabled: boolean; examples: string[] }) {
  const [q, setQ] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  const submit = async (question: string) => {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setQ("");
    setTurns((t) => [...t, { question: text }]);
    try {
      const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text }) });
      const body = (await res.json()) as { answer?: Answer; error?: string };
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, answer: body.answer, error: body.error } : x)));
    } catch {
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, error: "Couldn't reach the server." } : x)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {!enabled && (
        <p className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">
          <Info className="mt-0.5 size-4 shrink-0" /> Amazon Pulse AI needs an Anthropic API key (ANTHROPIC_API_KEY). Until it&apos;s set, the example questions below open the screen that answers them.
        </p>
      )}
      {turns.map((t, i) => (
        <div key={i} className="space-y-3">
          <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-white">{t.question}</p>
          {!t.answer && !t.error && (
            <p className="flex items-center gap-2 text-[13px] text-muted-foreground" aria-live="polite">
              <Loader2 className="size-4 animate-spin" /> Checking the data…
            </p>
          )}
          {t.error && <p className="rounded-md bg-negative-soft px-3 py-2 text-[13px] text-negative">{t.error}</p>}
          {t.answer && <AnswerCard a={t.answer} />}
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(q);
        }}
        className="flex items-end gap-2 rounded-xl border bg-white p-2 focus-within:ring-2 focus-within:ring-primary/30"
      >
        <label htmlFor="ai-q" className="sr-only">
          Ask about your product data
        </label>
        <textarea
          id="ai-q"
          rows={2}
          maxLength={500}
          value={q}
          disabled={!enabled}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(q);
            }
          }}
          placeholder={enabled ? "Which products are trending this month?" : "Set ANTHROPIC_API_KEY to ask questions"}
          className="min-h-11 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-subtle-foreground"
        />
        <Button type="submit" size="icon" disabled={!enabled || busy || !q.trim()} aria-label="Ask">
          {busy ? <Loader2 className="animate-spin" /> : <ArrowUp />}
        </Button>
      </form>
      <ul className="flex flex-wrap gap-2">
        {examples.map((x) => (
          <li key={x}>
            <button
              type="button"
              disabled={!enabled || busy}
              onClick={() => void submit(x)}
              className="rounded-full border bg-white px-3 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {x}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnswerCard({ a }: { a: Answer }) {
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
          <Bot className="size-4" />
        </span>
        <p className="text-sm leading-relaxed">{a.summary}</p>
      </div>
      {a.metrics.length > 0 && (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {a.metrics.map((m) => (
            <div key={m.label} className="rounded-md bg-surface p-2.5">
              <dt className="text-[11px] text-muted-foreground">{m.label}</dt>
              <dd className="tabular text-sm font-semibold">{m.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {a.products.length > 0 && (
        <ul className="divide-y rounded-md border">
          {a.products.map((p) => (
            <li key={p.asin} className="px-3 py-2 text-[13px]">
              <Link href={`/products/${p.asin}`} className="font-medium hover:text-primary">
                {p.title}
              </Link>
              <span className="ml-1 font-mono text-[11px] text-muted-foreground">{p.asin}</span>
              {p.note && <span className="block text-xs text-muted-foreground">{p.note}</span>}
            </li>
          ))}
        </ul>
      )}
      <dl className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-medium">Time period</dt>
          <dd className="text-muted-foreground">{a.period}</dd>
        </div>
        <div>
          <dt className="font-medium">Data freshness</dt>
          <dd className="text-muted-foreground">{a.data_freshness}</dd>
        </div>
      </dl>
      {a.limitations.length > 0 && (
        <div className="text-xs">
          <p className="font-medium">Limitations</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-muted-foreground">
            {a.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
