"use client";

import { Info } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/data/states";
import { visibleFields } from "@/lib/rbac";
import { fmtCurrency, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/types";

const STATUS_STYLE: Record<Invoice["status"], string> = {
  DRAFT: "text-[var(--d2d-ink-soft)]",
  SENT: "text-[var(--d2d-dispatched,#3e5fbf)]",
  VIEWED: "text-[var(--st-assigned)]",
  PAID: "text-[var(--d2d-success)]",
  OVERDUE: "text-[var(--d2d-danger)]",
};

export default function InvoicesPage() {
  const { scope, role } = useSession();
  const { data: invoices, loading, error, retry } = useAsync(
    () => api.getInvoices(scope!),
    [scope?.branchId, scope?.role]
  );

  if (!scope || !role) return null;
  const showMargin = visibleFields(role).margin;

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Invoice and payment status — recorded, never processed." />

      {/* Unmissable payments notice (spec §8.10) */}
      <div className="mb-4 flex items-start gap-2.5 rounded-[var(--radius)] border border-[var(--d2d-line-strong)] bg-[var(--d2d-signal-tint)] px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--d2d-signal)]" />
        <p className="text-body-sm text-[var(--d2d-ink)]">
          <strong>Docks2Doc does not process payments.</strong> Payments move directly between
          shipper, broker and carrier. This platform records invoice and payment status only.
        </p>
      </div>

      {loading ? (
        <TableSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : !invoices || invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          body="Invoices auto-generate the moment a load is delivered. Complete a delivery to see one here."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="d2d-scroll overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <caption className="sr-only">Invoices</caption>
              <thead>
                <tr className="border-b border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] text-left text-label text-[var(--d2d-ink-faint)]">
                  <th scope="col" className="px-4 py-2.5">Invoice</th>
                  <th scope="col" className="px-4 py-2.5">Load</th>
                  <th scope="col" className="px-4 py-2.5">Bill to</th>
                  <th scope="col" className="px-4 py-2.5">Issued</th>
                  <th scope="col" className="px-4 py-2.5">Due</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Total</th>
                  {showMargin && <th scope="col" className="px-4 py-2.5 text-right">Margin</th>}
                  <th scope="col" className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--d2d-line)] hover:bg-[var(--d2d-surface-sunk)]">
                    <td className="px-4 py-2.5 font-mono text-[13px] font-medium">{inv.number}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--d2d-ink-soft)]">{inv.loadId}</td>
                    <td className="px-4 py-2.5 text-[var(--d2d-ink-soft)]">{inv.billTo}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px]">{fmtDate(inv.issuedAt)}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px]">{fmtDate(inv.dueAt)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-medium">{fmtCurrency(inv.total)}</td>
                    {showMargin && (
                      <td className="px-4 py-2.5 text-right font-mono font-medium text-[var(--d2d-primary)]">
                        {fmtCurrency(inv.marginUsd ?? 0)}
                      </td>
                    )}
                    <td className={cn("px-4 py-2.5 font-medium", STATUS_STYLE[inv.status])}>
                      {inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
