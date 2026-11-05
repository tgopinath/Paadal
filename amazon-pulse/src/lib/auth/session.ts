import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db, hasDatabase } from "../db";
import { appMode } from "../data/repository";

export const SESSION_COOKIE = "pulse_session";
const SESSION_DAYS = 30;

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
}

/** Accounts need the database. In production they are also mandatory. */
export function authAvailable(): boolean {
  return hasDatabase();
}
export function authRequired(): boolean {
  return appMode() === "production";
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("base64url");

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const sql = db();
  await sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${sha256(token)}, ${userId}, ${expires})`;
  // Opportunistic cleanup of expired sessions.
  await sql`DELETE FROM sessions WHERE expires_at < now()`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

/** Reads and validates the session cookie. Request-time: call inside <Suspense>. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!authAvailable()) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const [u] = await db()<CurrentUser[]>`
    SELECT u.id, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${sha256(token)} AND s.expires_at > now()`;
  return u ?? null;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && authAvailable()) await db()`DELETE FROM sessions WHERE token_hash = ${sha256(token)}`;
  store.delete(SESSION_COOKIE);
}

/** Only same-site relative paths may be used as a post-login destination. */
export function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
