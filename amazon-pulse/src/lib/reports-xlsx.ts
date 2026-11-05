import "server-only";
import ExcelJS from "exceljs";
import type { Report } from "./reports";

const NUM_FMT: Record<string, string> = {
  INR: "₹#,##0",
  "%": "0.0",
  index: "0.0",
  int: "#,##0",
};

function formatFor(column: string): string | undefined {
  if (/\(INR\)/.test(column)) return NUM_FMT.INR;
  if (/%/.test(column)) return NUM_FMT["%"];
  if (/demand|Rating|score/i.test(column)) return NUM_FMT.index;
  if (/Rank|BSR|reviews|Products|Days/i.test(column)) return NUM_FMT.int;
  return undefined;
}

/** One-sheet workbook: title block with period and data-source notes, then the table. */
export async function reportToXlsx(r: Report): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Amazon Pulse";
  wb.created = new Date();
  const ws = wb.addWorksheet("Report", { views: [{ state: "frozen", ySplit: 0 }] });

  ws.addRow([r.title]).font = { bold: true, size: 14 };
  ws.addRow([`Period: ${r.period}`]);
  ws.addRow([`Generated: ${r.generatedAt}`]);
  for (const n of r.notes) {
    const row = ws.addRow([n]);
    if (n.includes("DEMO")) row.font = { bold: true, color: { argb: "FFB45309" } };
    else row.font = { color: { argb: "FF6B7280" } };
  }
  ws.addRow([]);
  const headerRow = ws.addRow(r.columns);
  headerRow.font = { bold: true };
  headerRow.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF7F8FA" } };
    c.border = { bottom: { style: "thin", color: { argb: "FFE6E8EC" } } };
  });
  for (const row of r.rows) ws.addRow(row.map((v) => (v == null ? null : v)));

  const headerIdx = headerRow.number;
  ws.views = [{ state: "frozen", ySplit: headerIdx }];
  if (r.columns.length) ws.autoFilter = { from: { row: headerIdx, column: 1 }, to: { row: headerIdx, column: r.columns.length } };
  r.columns.forEach((col, i) => {
    const c = ws.getColumn(i + 1);
    const fmt = formatFor(col);
    if (fmt) c.numFmt = fmt;
    const longest = Math.max(col.length, ...r.rows.slice(0, 200).map((row) => String(row[i] ?? "").length));
    c.width = Math.min(60, Math.max(8, longest + 2));
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
