import { getData } from "@/lib/data/repository";
import { authRequired, getCurrentUser } from "@/lib/auth/session";
import { buildReport, reportToCSV, REPORT_TYPES, type ReportType } from "@/lib/reports";

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
  const name = `amazon-pulse-${type}-${ds.today}${sources.includes("demo") ? "-DEMO" : ""}.csv`;
  return new Response(reportToCSV(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
