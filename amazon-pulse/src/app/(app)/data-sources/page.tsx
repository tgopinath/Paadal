import type { Metadata } from "next";
import { CheckCircle2, CircleDashed, ExternalLink, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { CSV_COLUMNS, PROVIDERS, providerStatus } from "@/lib/providers";
import { appMode } from "@/lib/data/repository";

export const metadata: Metadata = { title: "Data Sources" };

export default function DataSourcesPage() {
  const mode = appMode();
  return (
    <>
      <PageHeader
        title="Data Sources"
        description="Amazon Pulse only uses permitted sources. Credentials are read from environment variables or your secrets manager on the server; they are never stored in the database or shown in the browser."
      />
      <div className="space-y-6">
        <Card className={mode === "demo" ? "border-amber-200 bg-warning-soft/60" : ""}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
            <div>
              <p className="text-sm font-semibold">Mode: {mode === "demo" ? "Demo" : "Production"}</p>
              <p className="text-[13px] text-muted-foreground">
                {mode === "demo"
                  ? "The app is showing a synthetic dataset. Set APP_MODE=production and DATABASE_URL, then configure at least one provider below, to use real data."
                  : "Demo data is disabled. Reports use only snapshots collected from the providers below."}
              </p>
            </div>
            <code className="rounded bg-white px-2 py-1 text-xs">APP_MODE={mode}</code>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          {PROVIDERS.map((p) => {
            const st = providerStatus(p);
            return (
              <Card key={p.id}>
                <CardHeader>
                  <div>
                    <CardTitle>{p.name}</CardTitle>
                    <CardDescription>
                      <a href={p.docsUrl} target={p.docsUrl.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        Documentation {p.docsUrl.startsWith("http") && <ExternalLink className="size-3" />}
                      </a>
                    </CardDescription>
                  </div>
                  {p.envVars.length === 0 ? (
                    <Badge variant="neutral">Upload based</Badge>
                  ) : st.configured ? (
                    <Badge variant="positive">
                      <CheckCircle2 /> Credentials set
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <CircleDashed /> Not configured
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-4 text-[13px]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 font-medium">Provides</p>
                      <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                        {p.provides.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1 font-medium">Limits</p>
                      <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                        {p.limitations.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {p.envVars.length > 0 && (
                    <ul className="divide-y rounded-md border">
                      {p.envVars.map((v) => (
                        <li key={v.name} className="flex items-center justify-between gap-3 px-3 py-2">
                          <span>
                            <code className="text-xs">{v.name}</code>
                            <span className="block text-[11px] text-muted-foreground">{v.description}</span>
                          </span>
                          {st.missing.includes(v.name) ? (
                            <span className="text-[11px] text-muted-foreground">missing</span>
                          ) : (
                            <span className="text-[11px] text-positive">set{v.secret ? " (hidden)" : ""}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[11px] text-subtle-foreground">Ingestion adapter: planned for Phase 6.</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card id="csv-format" className="scroll-mt-24">
          <CardHeader>
            <div>
              <CardTitle>CSV history format</CardTitle>
              <CardDescription>One row per product per capture date. Rows with a missing or future capture date are rejected; history is never inferred.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-0">
            <Table>
              <THead>
                <tr>
                  <TH>Column</TH>
                  <TH>Required</TH>
                  <TH>Example</TH>
                  <TH>Notes</TH>
                </tr>
              </THead>
              <TBody>
                {CSV_COLUMNS.map((c) => (
                  <TR key={c.name}>
                    <TD>
                      <code className="text-xs">{c.name}</code>
                    </TD>
                    <TD>{c.required ? "Yes" : "—"}</TD>
                    <TD className="font-mono text-xs">{c.example}</TD>
                    <TD className="text-[13px] text-muted-foreground">{c.note}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex gap-3 pt-5 text-[13px] text-muted-foreground">
            <ShieldCheck className="size-5 shrink-0 text-positive" aria-hidden />
            <p>
              Amazon Pulse does not scrape Amazon shopping pages and never bypasses CAPTCHA, authentication, rate limits or anti-bot protection. It does not claim access to Amazon&apos;s private
              marketplace-wide transaction data. Verified sales are only ever your own, from SP-API.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
