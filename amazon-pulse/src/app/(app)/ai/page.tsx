import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Bot } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import { connection } from "next/server";
import { Assistant } from "@/components/ai/assistant";

export const metadata: Metadata = { title: "AI Insights" };

const QUESTIONS: { q: string; href: string }[] = [
  { q: "Which products are trending this month?", href: "/trending?lens=month" },
  { q: "What were the top 10 products last January?", href: "/history?p=month&m=2026-01" },
  { q: "Which products have improved their rankings in the past 30 days?", href: "/trending?lens=fastest" },
  { q: "Which category has the strongest demand?", href: "/categories" },
  { q: "Find products under ₹500 with high demand signals.", href: "/products?pmax=500&demand=very_high,high" },
  { q: "Which products have relatively low competition?", href: "/products?sort=competition" },
  { q: "Suggest 10 products I can investigate for my Amazon business.", href: "/opportunities?class=high" },
  { q: "Compare the demand patterns of these two products.", href: "/compare" },
  { q: "Which products have seasonal demand around Diwali?", href: "/trending?lens=seasonal" },
];

export default function AiPage() {
  return (
    <>
      <PageHeader
        title="Amazon Pulse AI"
        description="Ask questions in plain language and get answers built only from your database records: a summary, supporting metrics, the products involved, the time period, data freshness and the limits of the data."
      />
      <div className="mb-8 max-w-3xl">
        <Suspense fallback={null}>
          <AssistantPanel />
        </Suspense>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Explore without AI</CardTitle>
              <CardDescription>Each question opens the screen that answers it from snapshot data.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-0">
            <ul className="divide-y">
              {QUESTIONS.map((x) => (
                <li key={x.q}>
                  <Link href={x.href} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-surface sm:px-6">
                    <span>{x.q}</span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="size-4 text-primary" aria-hidden /> How answers are built
              </CardTitle>
              <CardDescription>Grounded on records, never on the model&apos;s memory.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed">
              <li>Claude answers by calling the same analytics functions that power these screens (period ranking, search, trending, categories, product detail, comparison, opportunities). It never writes free-form SQL.</li>
              <li>It only sees the rows those functions return, plus the period, coverage, data source and latest snapshot date.</li>
              <li>Every answer shows a summary, supporting metrics, the products, the time period, data freshness and data limitations.</li>
              <li>If a period has no snapshots, the answer says &ldquo;Historical data not available&rdquo;. Estimates are labelled as estimates, and predictions are never stated as facts.</li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">Questions are sent to Anthropic&apos;s API with the relevant product rows. Each question costs a few API calls.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

async function AssistantPanel() {
  await connection(); // the API key is checked at request time
  const enabled = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  return <Assistant enabled={enabled} examples={QUESTIONS.slice(0, 6).map((x) => x.q)} />;
}
