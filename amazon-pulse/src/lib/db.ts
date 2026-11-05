import "server-only";
import postgres, { type Sql } from "postgres";

/**
 * Shared Postgres pool. One per server instance; reused across hot reloads in
 * development. Serverless hosts should point DATABASE_URL at a pooled endpoint
 * (e.g. PgBouncer / Neon pooler / Supabase pooler).
 */
const globalForDb = globalThis as unknown as { __pulseSql?: Sql };

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function db(): Sql {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  globalForDb.__pulseSql ??= postgres(process.env.DATABASE_URL, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
    // NUMERIC arrives as text; parse here so callers get numbers.
    types: {
      numeric: { to: 1700, from: [1700], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
    },
  });
  return globalForDb.__pulseSql;
}
