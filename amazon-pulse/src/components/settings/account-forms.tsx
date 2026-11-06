"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { changePassword, deleteAccount, updateProfile, type FormState } from "@/app/(app)/settings/actions";

function Status({ s }: { s: FormState }) {
  if (s.error) return <p role="alert" className="text-[13px] text-negative">{s.error}</p>;
  if (s.ok) return <p role="status" className="text-[13px] text-positive">{s.ok}</p>;
  return null;
}

export function ProfileForm({ name, email }: { name: string | null; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  return (
    <form action={action} className="grid gap-3 sm:max-w-md">
      <div className="grid gap-1.5">
        <Label htmlFor="acc-email">Email</Label>
        <Input id="acc-email" value={email} disabled readOnly />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="acc-name">Name</Label>
        <Input id="acc-name" name="name" defaultValue={name ?? ""} maxLength={100} autoComplete="name" />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save name"}
        </Button>
        <Status s={state} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  return (
    <form action={action} className="grid gap-3 sm:max-w-md">
      <div className="grid gap-1.5">
        <Label htmlFor="pw-current">Current password</Label>
        <Input id="pw-current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pw-next">New password</Label>
        <Input id="pw-next" name="next" type="password" autoComplete="new-password" minLength={10} required />
        <p className="text-[11px] text-muted-foreground">At least 10 characters. Other devices will be signed out.</p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Changing…" : "Change password"}
        </Button>
        <Status s={state} />
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, {});
  if (!open)
    return (
      <Button type="button" variant="outline" className="border-red-200 text-negative hover:bg-negative-soft" onClick={() => setOpen(true)}>
        Delete my account…
      </Button>
    );
  return (
    <form action={action} className="grid gap-3 rounded-md border border-red-200 bg-negative-soft/40 p-4 sm:max-w-md">
      <p className="text-[13px]">
        This permanently deletes your account, watchlists, alerts, saved costs and report history. Product data stays, because it&apos;s shared across the workspace.
      </p>
      <div className="grid gap-1.5">
        <Label htmlFor="del-pw">Password</Label>
        <Input id="del-pw" name="password" type="password" autoComplete="current-password" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="del-confirm">Type DELETE to confirm</Label>
        <Input id="del-confirm" name="confirm" autoComplete="off" required />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Deleting…" : "Delete account"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Status s={state} />
      </div>
    </form>
  );
}
