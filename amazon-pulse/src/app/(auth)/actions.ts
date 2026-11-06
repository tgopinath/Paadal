"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { dummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import { authAvailable, createSession, destroySession, safeNext } from "@/lib/auth/session";

export interface AuthState {
  error?: string;
  fields?: { email?: string; name?: string };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_FAILS_PER_EMAIL = 5;
const MAX_FAILS_PER_IP = 30;
const WINDOW = "15 minutes";

async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  if (!authAvailable()) return { error: "Accounts need a database. Set DATABASE_URL first." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = safeNext(form.get("next"));
  if (!EMAIL_RE.test(email) || !password) return { error: "Enter your email and password.", fields: { email } };

  const sql = db();
  const ip = await clientIp();
  const [{ by_email, by_ip }] = await sql<{ by_email: number; by_ip: number }[]>`
    SELECT
      count(*) FILTER (WHERE lower(email) = ${email})::int AS by_email,
      count(*) FILTER (WHERE ip = ${ip})::int AS by_ip
    FROM login_attempts WHERE created_at > now() - ${WINDOW}::interval`;
  if (by_email >= MAX_FAILS_PER_EMAIL || (ip && by_ip >= MAX_FAILS_PER_IP)) {
    return { error: "Too many attempts. Wait 15 minutes and try again.", fields: { email } };
  }

  const [user] = await sql<{ id: string; password_hash: string }[]>`SELECT id, password_hash FROM users WHERE lower(email) = ${email}`;
  const ok = await verifyPassword(password, user?.password_hash ?? (await dummyHash()));
  if (!user || !ok) {
    await sql`INSERT INTO login_attempts (email, ip) VALUES (${email}, ${ip})`;
    return { error: "Email or password is incorrect.", fields: { email } };
  }
  await sql`DELETE FROM login_attempts WHERE lower(email) = ${email}`;
  await createSession(user.id);
  redirect(next);
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  if (!authAvailable()) return { error: "Accounts need a database. Set DATABASE_URL first." };
  const name = String(form.get("name") ?? "").trim().slice(0, 100);
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const fields = { email, name };
  if (!EMAIL_RE.test(email) || email.length > 254) return { error: "Enter a valid email address.", fields };
  if (password.length < 10) return { error: "Use at least 10 characters for your password.", fields };
  if (password.length > 200) return { error: "That password is too long (200 characters max).", fields };
  if (password.toLowerCase().includes(email.split("@")[0]) && email.split("@")[0].length >= 4) {
    return { error: "Your password shouldn't contain your email name.", fields };
  }

  const sql = db();
  const hash = await hashPassword(password);
  const [user] = await sql<{ id: string }[]>`
    INSERT INTO users (name, email, password_hash) VALUES (${name || null}, ${email}, ${hash})
    ON CONFLICT DO NOTHING RETURNING id`;
  if (!user) return { error: "An account with this email already exists. Sign in instead.", fields };
  await sql`INSERT INTO watchlists (user_id, name, is_default) VALUES (${user.id}, 'My watchlist', true)`;
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/login");
}
