import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { authAvailable, getCurrentUser } from "@/lib/auth/session";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "@/components/settings/account-forms";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { CATEGORIES, CATEGORY_ECONOMICS } from "@/lib/categories";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Your account, and the fee and tax assumptions used for screening." />
      <div className="space-y-6">
        <Suspense fallback={<Skeleton className="h-40 w-full rounded-lg" />}>
          <AccountSection />
        </Suspense>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Category fee and tax assumptions</CardTitle>
              <CardDescription>
                Used for opportunity screening and as calculator defaults. These are approximate estimates. Check them against the current Amazon.in fee schedule and your GST classification; you can override them per product in the calculator.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-0 sm:px-0">
            <Table>
              <THead>
                <tr>
                  <TH>Category</TH>
                  <TH className="text-right">Referral fee</TH>
                  <TH className="text-right">Typical GST</TH>
                  <TH className="text-right">Screening cost ratio</TH>
                  <TH>Return risk</TH>
                </tr>
              </THead>
              <TBody>
                {CATEGORIES.map((c) => {
                  const e = CATEGORY_ECONOMICS[c.id];
                  return (
                    <TR key={c.id}>
                      <TD>{c.name}</TD>
                      <TD className="tabular text-right">{e.referralFeePct}%</TD>
                      <TD className="tabular text-right">{e.gstRatePct}%</TD>
                      <TD className="tabular text-right">{Math.round(e.typicalCostRatio * 100)}% of price</TD>
                      <TD className="capitalize">{e.returnRisk}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

async function AccountSection() {
  await connection();
  const user = authAvailable() ? await getCurrentUser() : null;
  if (!user) {
    return (
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              {authAvailable()
                ? "Sign in to manage your account."
                : "Accounts need a database (DATABASE_URL). In demo mode, watchlists and alerts are saved on this device."}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }
  return (
    <>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your name appears in the top bar.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user.name} email={user.email} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Password</CardTitle>
            <CardDescription>Changing it signs you out everywhere else.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Delete account</CardTitle>
            <CardDescription>Permanently removes your account and personal data.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <DeleteAccountForm />
        </CardContent>
      </Card>
    </>
  );
}
