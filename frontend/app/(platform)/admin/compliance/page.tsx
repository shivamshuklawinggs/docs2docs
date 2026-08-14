"use client";

import { useMemo, useState, useCallback } from "react";
import { AlertTriangle, ShieldAlert, FileWarning } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { PageHeader } from "@/components/shell/PageHeader";
import { KpiCard } from "@/components/data/KpiCard";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/data/states";
import { expiryStatus, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Flag = {
  id: string;
  category: "Insurance" | "Inspection" | "Driver licence" | "Medical cert" | "DOT authority";
  subject: string;
  detail: string;
  severity: "expired" | "expiring";
  date: string;
};

const CATEGORY_ICON: Record<Flag["category"], typeof ShieldAlert> = {
  Insurance: ShieldAlert,
  Inspection: FileWarning,
  "Driver licence": FileWarning,
  "Medical cert": FileWarning,
  "DOT authority": ShieldAlert,
};

export default function CompliancePage() {
  const { scope } = useSession();
  const [filter, setFilter] = useState<"ALL" | "expired" | "expiring">("ALL");
  const { data: equipment } = useAsync(() => scope ? api.getEquipment(scope) : Promise.resolve([]), [scope?.branchId]);
  const { data: drivers } = useAsync(() => scope ? api.getDrivers(scope) : Promise.resolve([]), [scope?.branchId]);
  const { data: branches } = useAsync(() => scope ? api.getBranches(scope) : Promise.resolve([]), [scope?.branchId]);
  const { data: companies } = useAsync(() => api.getCompanies(), []);

  const companyForBranch = useCallback((branchId: string): string => {
    const branch = branches?.find((b) => b.id === branchId);
    if (!branch) return "";
    return companies?.find((c) => c.id === branch.companyId)?.name ?? "";
  }, [branches, companies]);

  const flags: Flag[] = useMemo(() => {
    const out: Flag[] = [];
    for (const e of equipment ?? []) {
      const s = expiryStatus(e.insurance.expiry);
      if (s !== "ok") {
        out.push({
          id: `ins-${e.id}`,
          category: "Insurance",
          subject: `${e.unitNumber} (${companyForBranch(e.branchId)})`,
          detail: `${e.insurance.carrier} policy ${e.insurance.policy}`,
          severity: s,
          date: e.insurance.expiry,
        });
      }
      const lastInsp = e.inspections[0];
      if (lastInsp?.result === "FAIL") {
        out.push({
          id: `insp-${e.id}`,
          category: "Inspection",
          subject: e.unitNumber,
          detail: lastInsp.notes ?? "Failed inspection",
          severity: "expired",
          date: lastInsp.date,
        });
      }
    }
    for (const d of drivers ?? []) {
      const lic = d.driver?.licenses?.[0];
      if (lic) {
        const s = expiryStatus(lic.expiry);
        if (s !== "ok") {
          out.push({
            id: `lic-${d.id}`,
            category: "Driver licence",
            subject: d.name,
            detail: `CDL-${lic.class} ${lic.number}`,
            severity: s,
            date: lic.expiry,
          });
        }
      }
      const ms = expiryStatus(d.driver?.medicalCertExpiry ?? "");
      if (ms !== "ok") {
        out.push({
          id: `med-${d.id}`,
          category: "Medical cert",
          subject: d.name,
          detail: "DOT medical examiner certificate",
          severity: ms,
          date: d.driver?.medicalCertExpiry ?? "",
        });
      }
    }
    return out.sort((a, b) => +new Date(a.date) - +new Date(b.date));
  }, [equipment, drivers, companyForBranch]);

  const expired = flags.filter((f) => f.severity === "expired");
  const expiring = flags.filter((f) => f.severity === "expiring");
  const rows = filter === "ALL" ? flags : flags.filter((f) => f.severity === filter);

  return (
    <div>
      <PageHeader title="Compliance" subtitle="Expired and expiring insurance, inspections, licences and medical certs." />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Expired" value={String(expired.length)} deltaDir="down" />
        <KpiCard label="Expiring ≤30d" value={String(expiring.length)} deltaDir="neutral" />
        <KpiCard label="Failed inspections" value={String(flags.filter((f) => f.category === "Inspection").length)} />
      </div>

      <div className="mb-4 flex gap-1">
        {(["ALL", "expired", "expiring"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-[var(--radius)] px-3 py-1.5 text-body-sm capitalize",
              filter === f ? "bg-[var(--d2d-primary)] text-white" : "text-[var(--d2d-ink-soft)] hover:bg-[var(--d2d-surface-sunk)]"
            )}
          >
            {f === "ALL" ? "All flags" : f}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No compliance flags" body="Everything is within its compliance window." />
      ) : (
        <Card className="overflow-hidden">
          <div className="d2d-scroll overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <caption className="sr-only">Compliance flags</caption>
              <thead>
                <tr className="border-b border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] text-left text-label text-[var(--d2d-ink-faint)]">
                  <th scope="col" className="px-4 py-2.5">Category</th>
                  <th scope="col" className="px-4 py-2.5">Subject</th>
                  <th scope="col" className="px-4 py-2.5">Detail</th>
                  <th scope="col" className="px-4 py-2.5">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((f) => {
                  const Icon = CATEGORY_ICON[f.category];
                  return (
                    <tr key={f.id} className="border-b border-[var(--d2d-line)] hover:bg-[var(--d2d-surface-sunk)]">
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Icon
                            className={cn(
                              "h-3.5 w-3.5",
                              f.severity === "expired" ? "text-[var(--d2d-danger)]" : "text-[var(--d2d-warning)]"
                            )}
                          />
                          {f.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--d2d-ink-soft)]">{f.subject}</td>
                      <td className="px-4 py-2.5 text-[12px] text-[var(--d2d-ink-soft)]">{f.detail}</td>
                      <td
                        className={cn(
                          "px-4 py-2.5 font-mono text-[12px] font-medium",
                          f.severity === "expired" ? "text-[var(--d2d-danger)]" : "text-[var(--d2d-warning)]"
                        )}
                      >
                        {fmtDate(f.date)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
