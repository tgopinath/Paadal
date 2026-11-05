/**
 * Applies pending SQL migrations from db/migrations in filename order.
 * Each file runs in its own transaction and is recorded in schema_migrations.
 *
 *   DATABASE_URL=postgres://… npm run db:migrate
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  // `--if-configured` is used by the build: no database yet means nothing to migrate.
  if (process.argv.includes("--if-configured")) {
    console.log("DATABASE_URL not set; skipping migrations.");
    process.exit(0);
  }
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, onnotice: () => {} });
const dir = path.join(process.cwd(), "db", "migrations");

try {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  const done = new Set((await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name));
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  let applied = 0;
  for (const f of files) {
    if (done.has(f)) continue;
    const body = await readFile(path.join(dir, f), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`INSERT INTO schema_migrations (name) VALUES (${f})`;
    });
    console.log(`applied ${f}`);
    applied++;
  }
  console.log(applied ? `${applied} migration(s) applied.` : "Database is up to date.");
} finally {
  await sql.end();
}
