import { getData } from "@/lib/data/repository";
import { authRequired, getCurrentUser } from "@/lib/auth/session";
import { buildReport, reportToCSV, REPORT_TYPES, type ReportType } from "@/lib/reports";
import { reportToXlsx } from "@/lib/reports-xlsx";

export async function GET(request: Request) {
  if (authRequired() && !(await getCurrentUser())) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as ReportType;
  if (!REPORT_TYPES.some((t) => t.key === type)) {
    return Response.json({ error: "Unknown report type" }, { status: 400 });
  }
  const { ds, sources } = await getData();
  const p = Object.fromEntries(["p", "d", "m", "y", "from", "to"].map((k) => [k, url.searchParams.get(k) ?? undefined]));
  const report = buildReport(ds, sources, type, p, new Date().toISOString());
  const base = `amazon-pulse-${type}-${ds.today}${sources.includes("demo") ? "-DEMO" : ""}`;
  if (url.searchParams.get("format") === "xlsx") {
    return new Response(new Uint8Array(await reportToXlsx(report)), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${base}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(reportToCSV(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
