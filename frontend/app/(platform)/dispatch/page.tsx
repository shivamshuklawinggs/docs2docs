"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { useDataVersion } from "@/lib/store/data";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/loads/StatusPill";
import { ErrorState, TableSkeleton } from "@/components/data/states";
import { STATUS_LABEL } from "@/lib/lifecycle";
import { cn } from "@/lib/utils";
import type { Driver, Load, LoadStatus } from "@/types";

const COLUMNS: LoadStatus[] = [
  "DISPATCHED",
  "ASSIGNED",
  "AT_PICKUP",
  "LOADED",
  "IN_TRANSIT",
  "AT_DELIVERY",
];

export default function DispatchPage() {
  const router = useRouter();
  const scope = useSession((s) => s.scope);
  const version = useDataVersion((s) => s.version);
  const bump = useDataVersion((s) => s.bump);
  const [dragDriver, setDragDriver] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const { data: loads, loading, error, retry } = useAsync(
    () => api.getLoads({}, scope!),
    [scope?.branchId, scope?.role, version]
  );
  const { data: drivers } = useAsync(() => api.getDrivers(scope!), [scope?.branchId, version]);

  if (!scope) return null;

  const available = (drivers ?? []).filter((d) => d.driver?.status === "AVAILABLE");

  const onDrop = async (loadId: string) => {
    if (!dragDriver) return;
    await api.assignDriver(loadId, dragDriver);
    setDragDriver(null);
    setDropTarget(null);
    bump();
  };

  return (
    <div>
      <PageHeader
        title="Dispatch board"
        subtitle="Drag an available driver onto an unassigned load to assign."
      />

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <div className="flex gap-4">
          {/* Available drivers rail */}
          <Card className="w-56 shrink-0 self-start p-3">
            <p className="mb-2 text-label text-[var(--d2d-ink-faint)]">
              Available drivers ({available.length})
            </p>
            <div className="space-y-2">
              {available.map((d) => (
                <DriverCard key={d.id} driver={d} onDragStart={() => setDragDriver(d.id)} />
              ))}
              {available.length === 0 && (
                <p className="text-[12px] text-[var(--d2d-ink-soft)]">
                  No available drivers in this scope.
                </p>
              )}
            </div>
          </Card>

          {/* Kanban columns */}
          <div className="d2d-scroll flex flex-1 gap-3 overflow-x-auto pb-2">
            {COLUMNS.map((status) => {
              const col = (loads ?? []).filter((l) => l.status === status);
              const isDropZone = status === "DISPATCHED";
              return (
                <div
                  key={status}
                  onDragOver={(e) => {
                    if (isDropZone) {
                      e.preventDefault();
                      setDropTarget(status);
                    }
                  }}
                  onDragLeave={() => setDropTarget(null)}
                  className={cn(
                    "flex w-64 shrink-0 flex-col rounded-[var(--radius)] bg-[var(--d2d-surface-sunk)] p-2",
                    dropTarget === status && "ring-2 ring-[var(--d2d-primary)]"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-label text-[var(--d2d-ink-soft)]">
                      {STATUS_LABEL[status]}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--d2d-ink-faint)]">
                      {col.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {col.map((l) => (
                      <LoadKanbanCard
                        key={l.id}
                        load={l}
                        canDrop={isDropZone}
                        onClick={() => router.push(`/loads/${l.id}`)}
                        onDrop={() => onDrop(l.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DriverCard({ driver, onDragStart }: { driver: Driver; onDragStart: () => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-grab rounded-[var(--radius)] border border-[var(--d2d-line)] bg-white p-2 active:cursor-grabbing"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--d2d-primary)] text-[10px] font-medium text-white">
          {driver.name.split(" ").map((p) => p[0]).join("")}
        </span>
        <div className="min-w-0">
          <p className="truncate text-body-sm font-medium">{driver.name}</p>
          <p className="flex items-center gap-1 text-[11px] text-[var(--d2d-ink-soft)]">
            <Star className="h-3 w-3 fill-[var(--d2d-signal)] text-[var(--d2d-signal)]" />
            {driver.driver?.rating}
          </p>
        </div>
      </div>
    </div>
  );
}

function LoadKanbanCard({
  load,
  canDrop,
  onClick,
  onDrop,
}: {
  load: Load;
  canDrop: boolean;
  onClick: () => void;
  onDrop: () => void;
}) {
  const exc = load.exceptions.some((e) => !e.resolvedAt);
  return (
    <div
      onClick={onClick}
      onDragOver={(e) => canDrop && e.preventDefault()}
      onDrop={(e) => {
        if (canDrop) {
          e.preventDefault();
          onDrop();
        }
      }}
      className={cn(
        "cursor-pointer rounded-[var(--radius)] border border-[var(--d2d-line)] bg-white p-2.5 hover:border-[var(--d2d-line-strong)]",
        exc && "border-l-[3px] border-l-[var(--d2d-danger)]"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] font-medium">{load.id}</span>
        <StatusPill status={load.status} exception={exc} size="sm" />
      </div>
      <p className="mt-1 text-[12px] text-[var(--d2d-ink-soft)]">
        {load.pickups?.[0]?.city || "Unknown"} → {load.deliveries?.[load.deliveries.length - 1]?.city || "Unknown"}
      </p>
      {canDrop && !load.driverId && (
        <p className="mt-1 text-[11px] italic text-[var(--d2d-ink-faint)]">Drop a driver to assign</p>
      )}
    </div>
  );
}
