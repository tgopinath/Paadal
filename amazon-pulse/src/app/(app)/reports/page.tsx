import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { NoHistory, NoDataYet } from "@/components/common/states";
import { TableSkeleton } from "@/components/common/skeletons";
import { PrintButton } from "@/components/common/print-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getData } from "@/lib/data/repository";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatRange } from "@/lib/dates";
import { buildReport, PERIOD_CHOICES, REPORT_TYPES, type ReportType } from "@/lib/reports";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

type Params = { type?: string; p?: string };

export default function ReportsPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <>
      <PageHeader title="Reports" description="Generate period, category, trending and opportunity reports. Every export includes the date range, data-source notes and coverage." />
      <Suspense fallback={<TableSkeleton />}>
        <Reports searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Reports({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const type = (REPORT_TYPES.some((t) => t.key === params.type) ? params.type : "weekly") as ReportType;
  const def = REPORT_TYPES.find((t) => t.key === type)!;
  const choices = PERIOD_CHOICES[type] ?? [];
  const p = choices.some(([k]) => k === params.p) ? params.p! : def.defaultPeriod;
  const { ds, sources, firstSnapshot, mode } = await getData();
  if (ds.products.length === 0) return <NoDataYet />;
  const report = buildReport(ds, sources, type, { p }, new Date().toISOString());
  const csvHref = `/api/reports?type=${type}${def.periodic ? `&p=${p}` : ""}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav aria-label="Report type" className="print:hidden">
        <ul className="flex gap-2 overflow-x-auto scrollbar-none lg:flex-col">
          {REPORT_TYPES.map((t) => (
            <li key={t.key}>
              <Link
                href={`/reports?type=${t.key}`}
                scroll={false}
                aria-current={t.key === type ? "page" : undefined}
                className={cn(
                  "flex h-9 items-center whitespace-nowrap rounded-md px-3 text-[13px] font-medium lg:h-10",
                  t.key === type ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface hover:text-foreground",
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0 space-y-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{report.title}</CardTitle>
              <CardDescription>{report.period}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              {report.available && (
                <Button asChild>
                  <a href={csvHref} download>
                    <Download /> CSV
                  </a>
                </Button>
              )}
              {report.available && <PrintButton />}
              {report.available && (
                <Button asChild variant="outline">
                  <a href={`${csvHref}&format=xlsx`} download>
                    <FileSpreadsheet /> Excel
                  </a>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {choices.length > 0 && (
              <div className="flex flex-wrap gap-2 print:hidden" role="group" aria-label="Report period">
                {choices.map(([k, l]) => (
                  <Button key={k} asChild size="sm" variant={k === p ? "default" : "outline"}>
                    <Link href={`/reports?type=${type}&p=${k}`} scroll={false} aria-current={k === p ? "true" : undefined}>
                      {l}
                    </Link>
                  </Button>
                ))}
                <Link href="/history" className="self-center text-[13px] text-primary hover:underline">
                  Other dates → Historical Analytics
                </Link>
              </div>
            )}
            <ul className="space-y-1 rounded-md bg-surface p-3 text-xs text-muted-foreground">
              {report.notes.map((n) => (
                <li key={n} className={n.startsWith("Data source: DEMO") ? "font-medium text-warning" : ""}>
                  {n}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        {!report.available ? (
          <NoHistory label={report.period} firstSnapshot={firstSnapshot} />
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <THead>
                <tr>
                  {report.columns.map((c) => (
                    <TH key={c}>{c}</TH>
                  ))}
                </tr>
              </THead>
              <TBody>
                {report.rows.slice(0, 50).map((r, i) => (
                  <TR key={i}>
                    {r.map((v, j) => (
                      <TD key={j} className={cn("text-[13px]", typeof v === "number" && "tabular text-right", report.columns[j] === "Explanation" && "min-w-[320px]")}>
                        {v ?? "—"}
                      </TD>
                    ))}
                  </TR>
                ))}
              </TBody>
            </Table>
            {report.rows.length > 50 && <p className="border-t px-5 py-3 text-xs text-muted-foreground">Preview shows 50 of {report.rows.length} rows. The CSV contains all of them.</p>}
          </Card>
        )}
        {mode === "production" && (
          <Suspense fallback={null}>
            <RecentExports />
          </Suspense>
        )}
      </div>
    </div>
  );
}

async function RecentExports() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await db()<{ id: string; report_type: string; date_start: string | null; date_end: string | null; filters: { format?: string } | null; created_at: Date }[]>`
    SELECT id, report_type, date_start::text, date_end::text, filters, created_at
    FROM user_reports WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 10`;
  if (!rows.length) return null;
  return (
    <Card className="print:hidden">
      <CardHeader>
        <div>
          <CardTitle>Your recent exports</CardTitle>
          <CardDescription>Download again for the same dates. Trending and opportunity reports always use the latest data.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2 sm:px-0">
        <ul className="divide-y">
          {rows.map((r) => {
            const def = REPORT_TYPES.find((t) => t.key === r.report_type);
            const format = r.filters?.format === "xlsx" ? "xlsx" : "csv";
            const range = r.date_start && r.date_end ? `&p=custom&from=${r.date_start}&to=${r.date_end}` : "";
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[13px] sm:px-6">
                <span>
                  <span className="font-medium">{def?.label ?? r.report_type}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {r.date_start && r.date_end ? formatRange(r.date_start, r.date_end) : "latest data"} · {format.toUpperCase()}
                  </span>
                  <span className="block text-[11px] text-subtle-foreground">
                    Exported {r.created_at.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </span>
                <a href={`/api/reports?type=${r.report_type}${range}${format === "xlsx" ? "&format=xlsx" : ""}`} download className="font-medium text-primary hover:underline">
                  Download again
                </a>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
