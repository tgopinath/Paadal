/**
 * Data access entry point for Server Components and route handlers.
 *
 * APP_MODE=demo        → deterministic synthetic dataset (default)
 * APP_MODE=production  → PostgreSQL via Prisma (Phase 6). Demo data is
 *                        refused in production so it can never leak into
 *                        real reports.
 */
import { connection } from "next/server";
import { todayIST } from "../dates";
import type { Dataset } from "../analytics/engine";
import { dataBounds } from "../analytics/engine";
import { generateDemoDataset } from "./demo-generator";
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
      "Production mode is enabled but no live data repository is connected yet. Configure DATABASE_URL and a data provider (see Data Sources), or set APP_MODE=demo.",
    );
    this.name = "DataSourceNotConnectedError";
  }
}

let cached: { day: ISODate; ctx: DataContext } | null = null;

export async function getData(): Promise<DataContext> {
  // Everything below depends on the current date, so it runs per request.
  await connection();
  const day = todayIST();
  if (cached?.day === day) return cached.ctx;

  if (appMode() === "production") {
    // The Postgres repository lands in Phase 6 (see docs/ARCHITECTURE.md).
    throw new DataSourceNotConnectedError();
  }

  const ds = generateDemoDataset(day);
  const { first, last } = dataBounds(ds);
  const ctx: DataContext = { mode: "demo", ds, sources: ["demo"], firstSnapshot: first, lastSnapshot: last };
  cached = { day, ctx };
  return ctx;
}
