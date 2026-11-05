import { db, hasDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { appMode } from "@/lib/data/repository";
import { applyOp, readState, type WatchOp } from "@/lib/watchlist-db";

/**
 * Account-backed watchlist. In demo mode, or when signed out, the client keeps
 * using device storage ({ mode: "local" }).
 */
async function context() {
  if (appMode() !== "production" || !hasDatabase()) return null;
  return getCurrentUser();
}

export async function GET() {
  const user = await context();
  if (!user) return Response.json({ mode: "local" });
  return Response.json({ mode: "remote", ...(await readState(db(), user.id)) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await context();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  let op: WatchOp;
  try {
    op = (await request.json()) as WatchOp;
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    await applyOp(db(), user.id, op);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
  return Response.json({ mode: "remote", ...(await readState(db(), user.id)) }, { headers: { "Cache-Control": "no-store" } });
}
