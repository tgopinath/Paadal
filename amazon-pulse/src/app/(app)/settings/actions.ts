"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth/session";

export interface FormState {
  ok?: string;
  error?: string;
}

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

async function passwordMatches(userId: string, password: string): Promise<boolean> {
  const [u] = await db()<{ password_hash: string }[]>`SELECT password_hash FROM users WHERE id = ${userId}`;
  return !!u && (await verifyPassword(password, u.password_hash));
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(form.get("name") ?? "").trim().slice(0, 100);
  await db()`UPDATE users SET name = ${name || null} WHERE id = ${user.id}`;
  revalidatePath("/", "layout");
  return { ok: "Name saved." };
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (!(await passwordMatches(user.id, current))) return { error: "Your current password is incorrect." };
  if (next.length < 10) return { error: "Use at least 10 characters for the new password." };
  if (next.length > 200) return { error: "That password is too long (200 characters max)." };
  if (next === current) return { error: "The new password must be different." };
  const local = user.email.split("@")[0];
  if (local.length >= 4 && next.toLowerCase().includes(local)) return { error: "Your password shouldn't contain your email name." };
  const sql = db();
  await sql`UPDATE users SET password_hash = ${await hashPassword(next)} WHERE id = ${user.id}`;
  // Sign out every other device, then start a fresh session here.
  await sql`DELETE FROM sessions WHERE user_id = ${user.id}`;
  await createSession(user.id);
  return { ok: "Password changed. Other devices have been signed out." };
}

export async function deleteAccount(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  if (String(form.get("confirm") ?? "").trim() !== "DELETE") return { error: 'Type DELETE to confirm.' };
  if (!(await passwordMatches(user.id, String(form.get("password") ?? "")))) return { error: "Your password is incorrect." };
  // Cascades to sessions, watchlists, alerts, saved costs and report history.
  // Product data and snapshots are shared and stay.
  await db()`DELETE FROM users WHERE id = ${user.id}`;
  await destroySession();
  redirect("/signup");
}
