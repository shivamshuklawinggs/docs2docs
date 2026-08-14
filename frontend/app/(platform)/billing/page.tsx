"use client";

import { CreditCard, Check } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const PLANS = [
  { key: "STARTER", label: "Starter", priceUsd: 49, seats: 5, features: ["Load board", "Basic documents", "Email support"] },
  { key: "GROWTH", label: "Growth", priceUsd: 149, seats: 25, features: ["Dispatch board", "E-signatures", "Priority support"] },
  { key: "ENTERPRISE", label: "Enterprise", priceUsd: 399, seats: 999, features: ["Multi-branch", "Super Admin tools", "Dedicated support"] },
] as const;

export default function BillingPage() {
  const { user, scope } = useSession();
  const { data: companies } = useAsync(() => api.getCompanies(), []);
  const { data: users } = useAsync(() => scope ? api.getUsers(scope) : Promise.resolve([]), [scope?.branchId]);

  if (!user) return null;
  const company = companies?.find((c) => c.id === user.companyId);
  if (!company) return null;

  const seatsUsed = users?.filter((u) => u.companyId === company.id).length ?? 0;
  const plan = PLANS.find((p) => p.key === company.plan) ?? PLANS[0];
  const invoices = [
    { id: "SUB-8841", date: new Date(Date.now() - 30 * 86400000).toISOString(), amount: plan.priceUsd },
    { id: "SUB-8790", date: new Date(Date.now() - 60 * 86400000).toISOString(), amount: plan.priceUsd },
    { id: "SUB-8732", date: new Date(Date.now() - 90 * 86400000).toISOString(), amount: plan.priceUsd },
  ];

  return (
    <div>
      <PageHeader title="Billing & subscription" subtitle="Plan, seats, invoice history and payment method." />

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <Card key={p.key} className={cn(p.key === plan.key && "ring-2 ring-[var(--d2d-primary)]")}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {p.label}
                {p.key === plan.key && (
                  <span className="rounded-full bg-[var(--d2d-primary-tint)] px-2 py-0.5 text-[11px] font-medium text-[var(--d2d-primary)]">
                    Current plan
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-display-md text-[var(--d2d-ink)]">
                {fmtCurrency(p.priceUsd)}<span className="text-body-sm font-normal text-[var(--d2d-ink-soft)]">/mo</span>
              </p>
              <p className="mt-1 text-[12px] text-[var(--d2d-ink-faint)]">Up to {p.seats === 999 ? "unlimited" : p.seats} seats</p>
              <ul className="mt-3 space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-body-sm text-[var(--d2d-ink-soft)]">
                    <Check className="h-3.5 w-3.5 text-[var(--d2d-success)]" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={p.key === plan.key ? "outline" : "primary"}
                className="mt-4 w-full"
                disabled={p.key === plan.key}
              >
                {p.key === plan.key ? "Current plan" : PLANS.findIndex((x) => x.key === p.key) > PLANS.findIndex((x) => x.key === plan.key) ? "Upgrade" : "Downgrade"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Seats</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-body-sm">
              <span className="text-[var(--d2d-ink-soft)]">Used</span>
              <span className="font-mono font-medium">{seatsUsed} / {plan.seats === 999 ? "∞" : plan.seats}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--d2d-surface-sunk)]">
              <div
                className="h-full bg-[var(--d2d-primary)]"
                style={{ width: `${plan.seats === 999 ? 15 : Math.min(100, (seatsUsed / plan.seats) * 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment method</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-14 items-center justify-center rounded-[var(--radius)] bg-[var(--d2d-surface-sunk)]">
                <CreditCard className="h-5 w-5 text-[var(--d2d-ink-soft)]" />
              </span>
              <div>
                <p className="text-body-sm font-medium">Visa •••• 4242</p>
                <p className="text-[12px] text-[var(--d2d-ink-faint)]">Expires 08/28</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto">Update</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Invoice history</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-t border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] text-left text-label text-[var(--d2d-ink-faint)]">
                <th scope="col" className="px-5 py-2.5">Invoice</th>
                <th scope="col" className="px-5 py-2.5">Date</th>
                <th scope="col" className="px-5 py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-t border-[var(--d2d-line)]">
                  <td className="px-5 py-2.5 font-mono">{i.id}</td>
                  <td className="px-5 py-2.5 font-mono text-[12px] text-[var(--d2d-ink-soft)]">{fmtDate(i.date)}</td>
                  <td className="px-5 py-2.5 text-right font-mono font-medium">{fmtCurrency(i.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
