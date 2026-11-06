/**
 * Data access entry point for Server Components and route handlers.
 *
 * APP_MODE=demo        → deterministic synthetic dataset (default)
 * APP_MODE=production  → PostgreSQL (daily_product_rollups). Demo rows are
 *                        excluded by the view, so they can never leak into
 *                        real reports.
 */
import { connection } from "next/server";
import { todayIST } from "../dates";
import type { Dataset } from "../analytics/engine";
import { dataBounds } from "../analytics/engine";
import { generateDemoDataset } from "./demo-generator";
import { dataVersion, loadDataset } from "./postgres-repository";
import { hasDatabase } from "../db";
import type { DataSourceKind, ISODate } from "../types";

export type AppMode = "demo" | "production";

export function appMode(): AppMode {
  return process.env.APP_MODE === "production" ? "production" : "demo";
}

export interface DataContext {
  mode: AppMode;
  ds: Dataset;
  sources: DataSourceKind[];
  firstSnapshot: ISODate | null;
  lastSnapshot: ISODate | null;
}

export class DataSourceNotConnectedError extends Error {
  constructor() {
    super(
      "Production mode is enabled but DATABASE_URL is not set. Configure the database (see README), or set APP_MODE=demo.",
    );
    this.name = "DataSourceNotConnectedError";
  }
}

let cached: { key: string; ctx: DataContext } | null = null;

export async function getData(): Promise<DataContext> {
  // Everything below depends on the current date, so it runs per request.
  await connection();
  const day = todayIST();

  if (appMode() === "production") {
    if (!hasDatabase()) throw new DataSourceNotConnectedError();
    // Reload only when a new ingestion run has finished or the day changes.
    const key = `${day}|${await dataVersion()}`;
    if (cached?.key === key) return cached.ctx;
    const { ds, sources } = await loadDataset(day);
    const { first, last } = dataBounds(ds);
    const ctx: DataContext = { mode: "production", ds, sources, firstSnapshot: first, lastSnapshot: last };
    cached = { key, ctx };
    return ctx;
  }

  if (cached?.key === `demo|${day}`) return cached.ctx;
  const ds = generateDemoDataset(day);
  const { first, last } = dataBounds(ds);
  const ctx: DataContext = { mode: "demo", ds, sources: ["demo"], firstSnapshot: first, lastSnapshot: last };
  cached = { key: `demo|${day}`, ctx };
  return ctx;
}
