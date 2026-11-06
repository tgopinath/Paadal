"use client";
import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Issue {
  line: number;
  message: string;
}
interface Resp {
  summary?: { totalLines: number; validRows: number; products: number; from: string | null; to: string | null };
  columns?: string[];
  errors?: Issue[];
  errorCount?: number;
  warnings?: Issue[];
  result?: { productsCreated: number; productsUpdated: number; rowsWritten: number };
  error?: string;
}

export function CsvImport({ enabled, reason, productionMode }: { enabled: boolean; reason?: string; productionMode: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [res, setRes] = useState<Resp | null>(null);

  const send = async (mode: "preview" | "import") => {
    if (!file) return;
    setBusy(mode);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("mode", mode);
    try {
      const r = await fetch("/api/import", { method: "POST", body: fd });
      setRes((await r.json()) as Resp);
    } catch {
      setRes({ error: "Upload failed. Check your connection and try again." });
    } finally {
      setBusy(null);
    }
  };

  if (!enabled) return <p className="rounded-md bg-surface px-3 py-2 text-[13px] text-muted-foreground">{reason}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          id="csv-file"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setRes(null);
          }}
        />
        <Button variant="outline" onClick={() => input.current?.click()}>
          <FileUp /> {file ? "Choose another file" : "Choose CSV file"}
        </Button>
        {file && (
          <span className="text-[13px] text-muted-foreground">
            {file.name} · {(file.size / 1024).toFixed(0)} KB
          </span>
        )}
        <a href="/api/import/template" className="text-[13px] text-primary hover:underline">
          Download template
        </a>
      </div>
      {file && !res?.result && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!busy} onClick={() => send("preview")}>
            {busy === "preview" && <Loader2 className="animate-spin" />} Check file
          </Button>
          <Button disabled={!!busy || !res?.summary?.validRows} onClick={() => send("import")} title={!res?.summary ? "Check the file first" : undefined}>
            {busy === "import" && <Loader2 className="animate-spin" />} Import {res?.summary?.validRows ? `${res.summary.validRows.toLocaleString("en-IN")} rows` : ""}
          </Button>
        </div>
      )}
      {res && (
        <div aria-live="polite" className="space-y-3 rounded-lg border p-4 text-[13px]">
          {res.error && (
            <p className="flex items-start gap-2 text-negative">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {res.error}
            </p>
          )}
          {res.result && (
            <p className="flex items-start gap-2 text-positive">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              Imported {res.result.rowsWritten.toLocaleString("en-IN")} snapshots: {res.result.productsCreated} new products, {res.result.productsUpdated} updated.
              {!productionMode && " The dashboard keeps showing demo data until APP_MODE=production."}
            </p>
          )}
          {res.summary && (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Rows in file" value={res.summary.totalLines.toLocaleString("en-IN")} />
              <Stat label="Valid rows" value={res.summary.validRows.toLocaleString("en-IN")} />
              <Stat label="Products" value={res.summary.products.toLocaleString("en-IN")} />
              <Stat label="Dates" value={res.summary.from ? `${res.summary.from} → ${res.summary.to}` : "—"} />
            </dl>
          )}
          {res.columns && res.columns.length > 0 && <p className="text-xs text-muted-foreground">Columns: {res.columns.join(" · ")}</p>}
          {!!res.errorCount && (
            <div>
              <p className="font-medium text-negative">{res.errorCount.toLocaleString("en-IN")} rows will be skipped</p>
              <ul className="mt-1 max-h-48 space-y-0.5 overflow-y-auto text-xs text-muted-foreground">
                {res.errors!.map((e, i) => (
                  <li key={i}>
                    {e.line ? `Line ${e.line}: ` : ""}
                    {e.message}
                  </li>
                ))}
                {res.errorCount > res.errors!.length && <li>…and {res.errorCount - res.errors!.length} more</li>}
              </ul>
            </div>
          )}
          {!!res.warnings?.length && (
            <ul className="space-y-0.5 text-xs text-warning">
              {res.warnings.map((w, i) => (
                <li key={i}>
                  {w.line ? `Line ${w.line}: ` : ""}
                  {w.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular font-medium">{value}</dd>
    </div>
  );
}
