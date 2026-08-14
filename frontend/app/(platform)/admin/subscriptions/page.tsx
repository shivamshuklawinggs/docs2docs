"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { PageHeader } from "@/components/shell/PageHeader";
import { KpiCard } from "@/components/data/KpiCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { fmtCurrency, fmtDate } from "@/lib/format";

const MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];

export default function SubscriptionsPage() {
  const { data: companies } = useAsync(() => api.getCompanies(), []);
  const totalMrr = (companies ?? []).reduce((s, c) => s + (c.mrrUsd ?? 0), 0);

  // Simulated 6-month MRR trend ending at the current total.
  const trend = MONTHS.map((m, i) => ({
    month: m,
    mrr: Math.round(totalMrr * (0.72 + i * 0.056)),
  }));

  const planMix = (["STARTER", "GROWTH", "ENTERPRISE"] as const).map((plan) => ({
    plan: plan.charAt(0) + plan.slice(1).toLowerCase(),
    count: (companies ?? []).filter((c) => c.plan === plan).length,
    mrr: (companies ?? []).filter((c) => c.plan === plan).reduce((s, c) => s + (c.mrrUsd ?? 0), 0),
  }));

  const renewals = (companies ?? [])
    .slice()
    .sort((a, b) => (b.mrrUsd ?? 0) - (a.mrrUsd ?? 0))
    .slice(0, 8)
    .map((c, i) => ({
      ...c,
      renewsAt: new Date(Date.now() + (i + 2) * 5 * 86400000).toISOString(),
    }));

  return (
    <div>
      <PageHeader title="Subscriptions" subtitle="Recurring revenue, plan mix, churn and upcoming renewals." />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="MRR" value={fmtCurrency(totalMrr)} delta="▲ 5.6% MoM" deltaDir="up" />
        <KpiCard label="Active accounts" value={String(companies?.length ?? 0)} delta="▲ 2" deltaDir="up" />
        <KpiCard label="Avg. revenue / account" value={fmtCurrency(Math.round(totalMrr / (companies?.length || 1)))} />
        <KpiCard label="Churn (30d)" value="1.2%" delta="▼ 0.3pt" deltaDir="up" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader><CardTitle>MRR trend</CardTitle></CardHeader>
          <CardContent className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ left: -20, right: 10 }}>
                <defs>
                  <linearGradient id="mrrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--d2d-primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--d2d-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--d2d-line)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip formatter={(v) => fmtCurrency(Number(v))} />
                <Area type="monotone" dataKey="mrr" stroke="var(--d2d-primary)" fill="url(#mrrFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Plan mix</CardTitle></CardHeader>
          <CardContent className="h-64 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planMix} margin={{ left: -20, right: 10 }}>
                <CartesianGrid stroke="var(--d2d-line)" vertical={false} />
                <XAxis dataKey="plan" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--d2d-signal)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Upcoming renewals</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-t border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] text-left text-label text-[var(--d2d-ink-faint)]">
                <th scope="col" className="px-5 py-2.5">Company</th>
                <th scope="col" className="px-5 py-2.5">Plan</th>
                <th scope="col" className="px-5 py-2.5">Renews</th>
                <th scope="col" className="px-5 py-2.5 text-right">MRR</th>
              </tr>
            </thead>
            <tbody>
              {renewals.map((c) => (
                <tr key={c.id} className="border-t border-[var(--d2d-line)]">
                  <td className="px-5 py-2.5 font-medium">{c.name}</td>
                  <td className="px-5 py-2.5 text-[var(--d2d-ink-soft)]">
                    {c.plan.charAt(0) + c.plan.slice(1).toLowerCase()}
                  </td>
                  <td className="px-5 py-2.5 font-mono text-[12px]">{fmtDate(c.renewsAt)}</td>
                  <td className="px-5 py-2.5 text-right font-mono font-medium">{fmtCurrency(c.mrrUsd ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
