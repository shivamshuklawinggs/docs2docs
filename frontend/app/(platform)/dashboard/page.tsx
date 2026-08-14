"use client";

import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { useDataVersion } from "@/lib/store/data";
import { PageHeader } from "@/components/shell/PageHeader";
import { KpiCard } from "@/components/data/KpiCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/loads/StatusPill";
import { LoadRail } from "@/components/loads/LoadRail";
import { TableSkeleton, ErrorState } from "@/components/data/states";
import { ROLE_LABEL } from "@/lib/rbac";
import { fmtCurrency, fmtPercent } from "@/lib/format";
import type { Load, Role } from "@/types";

function kpisForRole(role: Role, loads: Load[]) {
  const active = loads.filter((l) => !["PAID", "CANCELLED"].includes(l.status));
  const inTransit = loads.filter((l) => l.status === "IN_TRANSIT");
  const delivered = loads.filter((l) => ["DELIVERED", "INVOICED", "PAID"].includes(l.status));
  const unbilled = loads.filter((l) => l.status === "DELIVERED");
  const onTime = loads.length
    ? (loads.filter((l) => l.onTime).length / loads.length) * 100
    : 0;
  const unbilledUsd = unbilled.reduce((s, l) => s + (l.rates.carrierRateUsd ?? 0), 0);

  if (role === "BROKER_CORP" || role === "BROKER_BRANCH") {
    const posted = loads.length;
    const covered = loads.filter((l) => l.carrier).length;
    const margin = loads.reduce(
      (s, l) => s + ((l.rates.customerRateUsd ?? 0) - (l.rates.carrierRateUsd ?? 0)),
      0
    );
    const avgMarginPct = loads.length
      ? (loads.reduce(
          (s, l) =>
            s +
            (l.rates.customerRateUsd
              ? ((l.rates.customerRateUsd - (l.rates.carrierRateUsd ?? 0)) /
                  l.rates.customerRateUsd) *
                100
              : 0),
          0
        ) /
          loads.length)
      : 0;
    return [
      { label: "Loads posted", value: String(posted), delta: "▲ 6 vs last wk", deltaDir: "up" as const },
      { label: "Coverage rate", value: fmtPercent((covered / Math.max(posted, 1)) * 100), delta: "▲ 2.4pt", deltaDir: "up" as const },
      { label: "Avg margin %", value: fmtPercent(avgMarginPct), delta: "▼ 0.6pt", deltaDir: "down" as const },
      { label: "Margin MTD", value: fmtCurrency(margin), delta: "▲ 8%", deltaDir: "up" as const },
      { label: "Carriers at risk", value: "3", delta: "expired insurance", deltaDir: "neutral" as const },
    ];
  }

  if (role === "SHIPPER_RECEIVER") {
    return [
      { label: "Orders open", value: String(active.length), delta: "▲ 4 vs last wk", deltaDir: "up" as const },
      { label: "Awaiting pickup", value: String(loads.filter((l) => l.status === "DISPATCHED" || l.status === "ASSIGNED").length), deltaDir: "neutral" as const, delta: "—" },
      { label: "In transit", value: String(inTransit.length), delta: "▲ 2", deltaDir: "up" as const },
      { label: "Delivered (wk)", value: String(delivered.length), delta: "▲ 5", deltaDir: "up" as const },
      { label: "Avg dock turn", value: "48 min", delta: "▼ 6 min", deltaDir: "up" as const },
    ];
  }

  if (role === "SUPER_ADMIN") {
    return [
      { label: "Companies", value: "12", delta: "▲ 1", deltaDir: "up" as const },
      { label: "Active MRR", value: "$74,320", delta: "▲ 4.2%", deltaDir: "up" as const },
      { label: "Loads processed", value: String(loads.length), delta: "platform-wide", deltaDir: "neutral" as const },
      { label: "Docs signed", value: "1,284", delta: "▲ 63", deltaDir: "up" as const },
      { label: "On-time %", value: fmtPercent(onTime), delta: "▲ 0.8pt", deltaDir: "up" as const },
    ];
  }

  // Carrier
  return [
    { label: "Active loads", value: String(active.length), delta: "▲ 8 vs last wk", deltaDir: "up" as const },
    { label: "In transit", value: String(inTransit.length), delta: "▲ 3", deltaDir: "up" as const },
    { label: "Delivered (7d)", value: String(delivered.length), delta: "▼ 2", deltaDir: "down" as const },
    { label: "On-time %", value: fmtPercent(onTime), delta: "▲ 1.1pt", deltaDir: "up" as const },
    { label: "Unbilled", value: fmtCurrency(unbilledUsd), delta: `${unbilled.length} loads`, deltaDir: "neutral" as const },
  ];
}

export default function DashboardPage() {
  const { role, scope, user } = useSession();
  const version = useDataVersion((s) => s.version);
  const { data: loads, loading, error, retry } = useAsync(
    () => api.getLoads({}, scope!),
    [scope?.branchId, scope?.role, version]
  );

  if (!role || !scope) return null;

  const kpis = loads ? kpisForRole(role, loads) : [];
  const attention = (loads ?? [])
    .filter((l) => l.exceptions.some((e) => !e.resolvedAt) || (!l.driverId && l.status !== "DRAFT"))
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user?.name.split(" ")[0]}`}
        subtitle={`${ROLE_LABEL[role]} · ${scope.branchId === "ALL" ? "All branches" : "Branch view"}`}
      />

      {loading ? (
        <TableSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {kpis.map((k) => (
              <KpiCard key={k.label} {...k} />
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {/* Needs attention — most important block (spec §8.2) */}
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[var(--d2d-signal)]" />
                  Needs attention ({attention.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {attention.length === 0 && (
                  <p className="py-6 text-center text-body-sm text-[var(--d2d-ink-soft)]">
                    Nothing needs attention. Every active load is on track.
                  </p>
                )}
                {attention.map((l) => {
                  const exc = l.exceptions.find((e) => !e.resolvedAt);
                  return (
                    <Link
                      key={l.id}
                      href={`/loads/${l.id}`}
                      className="flex items-center gap-3 rounded-[var(--radius)] border-l-[3px] border-[var(--d2d-danger)] bg-[var(--d2d-danger-tint)]/40 px-3 py-2 hover:bg-[var(--d2d-danger-tint)]"
                    >
                      <span className="font-mono text-[13px] font-medium text-[var(--d2d-ink)]">{l.id}</span>
                      <span className="flex-1 text-body-sm text-[var(--d2d-ink-soft)]">
                        {exc ? exc.description : "Needs a driver assigned"}
                      </span>
                      <span className="text-[12px] text-[var(--d2d-ink-faint)]">
                        {l.pickup.city} → {l.delivery.city}
                      </span>
                      <ChevronRight className="h-4 w-4 text-[var(--d2d-ink-faint)]" />
                    </Link>
                  );
                })}
              </CardContent>
            </Card>

            {/* Recent loads with rail */}
            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(loads ?? []).slice(0, 6).map((l) => (
                  <Link
                    key={l.id}
                    href={`/loads/${l.id}`}
                    className="flex items-center gap-3 rounded-[var(--radius)] px-2 py-2 hover:bg-[var(--d2d-surface-sunk)]"
                  >
                    <span className="font-mono text-[13px] font-medium">{l.id}</span>
                    <StatusPill status={l.status} exception={l.exceptions.some((e) => !e.resolvedAt)} size="sm" />
                    <span className="flex-1 truncate text-[12px] text-[var(--d2d-ink-soft)]">
                      {l.pickup.city} → {l.delivery.city}
                    </span>
                    <LoadRail status={l.status} exception={l.exceptions.some((e) => !e.resolvedAt)} />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
