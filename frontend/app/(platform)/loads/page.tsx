"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { useDataVersion } from "@/lib/store/data";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/loads/StatusPill";
import { LoadRail } from "@/components/loads/LoadRail";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/data/states";
import { PermissionGate } from "@/components/shell/PermissionGate";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LoadFilter } from "@/types";

const SAVED_VIEWS = [
  { key: "", label: "All loads" },
  { key: "active", label: "All active" },
  { key: "needs-driver", label: "Needs driver" },
  { key: "at-risk", label: "At risk" },
  { key: "delivered-unbilled", label: "Delivered unbilled" },
];

export default function LoadBoardPage() {
  const router = useRouter();
  const scope = useSession((s) => s.scope);
  const version = useDataVersion((s) => s.version);
  const [view, setView] = useState("");
  const [search, setSearch] = useState("");

  const filter: LoadFilter = { savedView: view || undefined, search: search || undefined };
  const { data: loads, loading, error, retry } = useAsync(
    () => api.getLoads(filter, scope!),
    [scope?.branchId, scope?.role, view, search, version]
  );
  const { data: drivers } = useAsync(() => scope ? api.getDrivers(scope) : Promise.resolve([]), [scope?.branchId, version]);

  if (!scope) return null;

  return (
    <div>
      <PageHeader
        title="Load board"
        subtitle="The default working surface — every load, at a glance."
        actions={
          <PermissionGate action="create:order">
            <Button onClick={() => router.push("/loads/new")}>
              <Plus className="h-4 w-4" /> Create order
            </Button>
          </PermissionGate>
        }
      />

      {/* Filters + saved views */}
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--d2d-ink-faint)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search load ID, city, PO…"
              className="h-9 w-64 rounded-[var(--radius)] border border-[var(--d2d-line)] pl-9 pr-3 text-body-sm outline-none focus:border-[var(--d2d-primary)]"
            />
          </div>
          <div className="ml-auto flex flex-wrap gap-1.5">
            {SAVED_VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                className={cn(
                  "rounded-[var(--radius)] border px-3 py-1.5 text-body-sm transition-colors",
                  view === v.key
                    ? "border-[var(--d2d-primary)] bg-[var(--d2d-primary-tint)] font-medium text-[var(--d2d-primary)]"
                    : "border-[var(--d2d-line)] text-[var(--d2d-ink-soft)] hover:bg-[var(--d2d-surface-sunk)]"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <TableSkeleton rows={10} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : !loads || loads.length === 0 ? (
        <EmptyState
          title="No loads on this board yet"
          body="Create your first order to get started, or clear the current filter to see more."
          action={{ label: "Clear filter", onClick: () => { setView(""); setSearch(""); } }}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="d2d-scroll overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <caption className="sr-only">Load board — {loads.length} loads</caption>
              <thead>
                <tr className="border-b border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] text-left text-label text-[var(--d2d-ink-faint)]">
                  <th scope="col" className="px-4 py-2.5">Load ID</th>
                  <th scope="col" className="px-4 py-2.5">Status</th>
                  <th scope="col" className="px-4 py-2.5">Lane</th>
                  <th scope="col" className="px-4 py-2.5">Pickup</th>
                  <th scope="col" className="px-4 py-2.5">Delivery</th>
                  <th scope="col" className="px-4 py-2.5">Driver</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Rail</th>
                </tr>
              </thead>
              <tbody>
                {loads.map((l) => {
                  const exc = l.exceptions.some((e) => !e.resolvedAt);
                  return (
                    <tr
                      key={l._id}
                      onClick={() => router.push(`/loads/${l._id}`)}
                      className={cn(
                        "cursor-pointer border-b border-[var(--d2d-line)] transition-colors hover:bg-[var(--d2d-surface-sunk)]",
                        exc && "border-l-[3px] border-l-[var(--d2d-danger)]"
                      )}
                    >
                      <td className="px-4 py-2.5 font-mono text-[13px] font-medium text-[var(--d2d-ink)]">
                        {l.id}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={l.status} exception={exc} size="sm" />
                      </td>
                      <td className="px-4 py-2.5 text-[var(--d2d-ink-soft)]">
                        {l.pickup.city} → {l.delivery.city}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12px]">{fmtDate(l.pickup.windowStart)}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px]">{fmtDate(l.delivery.windowStart)}</td>
                      <td className="px-4 py-2.5 text-[var(--d2d-ink-soft)]">{drivers?.find((d) => d.id === l.driverId)?.name ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end">
                          <LoadRail status={l.status} exception={exc} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-[var(--d2d-line)] px-4 py-2 text-[12px] text-[var(--d2d-ink-faint)]">
            {loads.length} loads
          </div>
        </Card>
      )}
    </div>
  );
}
