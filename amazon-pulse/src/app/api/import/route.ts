import { db, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ingest } from "@/lib/data/ingest";
import { CSV_MAX_BYTES, validateCsv } from "@/lib/csv";
import { todayIST } from "@/lib/dates";

/**
 * POST multipart/form-data { file, mode: "preview" | "import" }.
 * Always validates; writes only in "import" mode, and only valid rows.
 */
export async function POST(request: Request) {
  if (!hasDatabase()) return Response.json({ error: "CSV import needs a database. Set DATABASE_URL." }, { status: 503 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to import data." }, { status: 401 });

  const len = Number(request.headers.get("content-length") ?? 0);
  if (len > CSV_MAX_BYTES + 64 * 1024) return Response.json({ error: "File is larger than 4 MB. Split it into smaller files." }, { status: 413 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Upload a CSV file." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Upload a CSV file." }, { status: 400 });
  if (file.size > CSV_MAX_BYTES) return Response.json({ error: "File is larger than 4 MB. Split it into smaller files." }, { status: 413 });

  const text = await file.text();
  const v = validateCsv(text, todayIST());
  const body = {
    summary: v.summary,
    columns: v.columns,
    errors: v.errors.slice(0, 50),
    errorCount: v.errors.length,
    warnings: v.warnings.slice(0, 20),
  };
  if (form.get("mode") !== "import") return Response.json(body);
  if (v.rows.length === 0) return Response.json({ ...body, error: "No valid rows to import." }, { status: 422 });

  try {
    const result = await ingest(db(), "csv", v.rows, `CSV ${file.name.slice(0, 120)} by ${user.email}`);
    return Response.json({ ...body, result });
  } catch (e) {
    console.error("CSV import failed", e);
    return Response.json({ ...body, error: "Import failed. Nothing was saved; the ingestion run is logged as failed." }, { status: 500 });
  }
}
