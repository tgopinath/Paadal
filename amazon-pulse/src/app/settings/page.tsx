import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { CATEGORIES, CATEGORY_ECONOMICS } from "@/lib/categories";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Account, fee and tax assumptions, and display preferences." />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Account</CardTitle>
              <CardDescription>Email and password sign-in ships with the database in Phase 6. Until then, watchlists and alerts are saved on this device only.</CardDescription>
            </div>
          </CardHeader>
        </Card>
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
