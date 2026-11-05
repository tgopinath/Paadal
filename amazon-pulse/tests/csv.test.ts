import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, parseDate, validateCsv } from "../src/lib/csv";

const TODAY = "2026-11-05";

test("parses quoted fields, escaped quotes, CRLF and BOM", () => {
  const t = parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n');
  assert.deepEqual(t, [
    ["a", "b"],
    ["x, y", 'say "hi"'],
  ]);
});

test("dates: ISO, Indian day-first, and invalid", () => {
  assert.equal(parseDate("2026-10-31"), "2026-10-31");
  assert.equal(parseDate("31/10/2026"), "2026-10-31");
  assert.equal(parseDate("5-1-2026"), "2026-01-05");
  assert.equal(parseDate("2026-02-30"), null);
  assert.equal(parseDate("Oct 31"), null);
});

test("valid rows import; bad rows are rejected with line numbers", () => {
  const csv = [
    "Date,ASIN,Product Name,Category,Price,MRP,Rating,Reviews,BSR",
    "2026-10-30,b0abcdefgh,Bottle,Home & Kitchen,₹799,1299,4.3,\"1,532\",#2140",
    ",B0ABCDEFGH,No date,,,,,,",
    "2026-12-01,B0ABCDEFGH,Future,,,,,,",
    "2026-10-30,SHORT,Bad asin,,,,,,",
    "2026-10-30,B0ZZZZZZZZ,Bad rating,,,,7,,",
    "2026-10-31,B0ABCDEFGH,Bottle,Garden Stuff,749,1299,4.3,1541,1985",
  ].join("\n");
  const r = validateCsv(csv, TODAY);
  assert.equal(r.summary.validRows, 2);
  assert.deepEqual(
    r.errors.map((e) => e.line),
    [3, 4, 5, 6],
  );
  assert.equal(r.rows[0].asin, "B0ABCDEFGH");
  assert.equal(r.rows[0].price, 799);
  assert.equal(r.rows[0].reviewCount, 1532);
  assert.equal(r.rows[0].bsr, 2140);
  assert.equal(r.rows[0].categoryId, "home-kitchen");
  assert.equal(r.rows[1].categoryId, "other");
  assert.ok(r.warnings.some((w) => w.message.includes("Garden Stuff")));
  assert.deepEqual([r.summary.from, r.summary.to], ["2026-10-30", "2026-10-31"]);
});

test("missing required columns stop the import", () => {
  const r = validateCsv("asin,price\nB0ABCDEFGH,10", TODAY);
  assert.equal(r.rows.length, 0);
  assert.match(r.errors[0].message, /captured_at/);
});

test("duplicate product/day keeps the later row", () => {
  const r = validateCsv("captured_at,asin,price\n2026-10-30,B0ABCDEFGH,10\n2026-10-30,B0ABCDEFGH,12", TODAY);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].price, 12);
  assert.equal(r.warnings.length, 2); // duplicate + no BSR column
});
