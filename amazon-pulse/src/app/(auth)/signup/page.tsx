import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { AuthForm } from "../auth-form";
import { signUp } from "../actions";
import { authAvailable } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}

async function Form() {
  await connection(); // DATABASE_URL is checked at request time
  return <AuthForm mode="signup" action={signUp} available={authAvailable()} />;
}
