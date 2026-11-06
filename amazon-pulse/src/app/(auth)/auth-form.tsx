"use client";
import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { AuthState } from "./actions";

export function AuthForm({ mode, action, available }: { mode: "login" | "signup"; action: (s: AuthState, f: FormData) => Promise<AuthState>; available: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  const next = useSearchParams().get("next") ?? "/";
  const signup = mode === "signup";
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{signup ? "Create your account" : "Sign in"}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{signup ? "Track products, save watchlists and set alerts." : "Welcome back to Amazon Pulse."}</p>
      </div>
      {!available && (
        <p role="alert" className="rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">
          Accounts need a database. Set DATABASE_URL (see README) to enable sign-in.
        </p>
      )}
      <input type="hidden" name="next" value={next} />
      {signup && (
        <div className="grid gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" defaultValue={state.fields?.name} maxLength={100} />
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 10 : undefined} />
        {signup && <p className="text-[11px] text-muted-foreground">At least 10 characters.</p>}
      </div>
      {state.error && (
        <p role="alert" aria-live="polite" className="rounded-md bg-negative-soft px-3 py-2 text-[13px] text-negative">
          {state.error}
        </p>
      )}
      <Button type="submit" className="h-10 w-full" disabled={pending || !available}>
        {pending ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in"}
      </Button>
      <p className="text-center text-[13px] text-muted-foreground">
        {signup ? "Already have an account? " : "New to Amazon Pulse? "}
        <Link href={`${signup ? "/login" : "/signup"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary hover:underline">
          {signup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
