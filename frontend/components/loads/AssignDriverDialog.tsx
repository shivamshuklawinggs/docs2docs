"use client";

import { useState } from "react";
import { Check, X, AlertTriangle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/mock/api";
import { useDataVersion } from "@/lib/store/data";
import { expiryStatus, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Driver, Load } from "@/types";

interface Check {
  label: string;
  ok: boolean;
  detail: string;
}

function buildChecks(driver: Driver, load: Load): Check[] {
  const lic = driver.driver?.licenses?.[0];
  const licOk = lic ? expiryStatus(lic.expiry) !== "expired" : false;
  const medOk = expiryStatus(driver.driver?.medicalCertExpiry ?? "") !== "expired";
  const needsHazmat = load.requiredQualifications.some((q) => /hazmat/i.test(q));
  const hasHazmat = driver.driver?.endorsements?.some((e: string) => /hazmat/i.test(e)) ?? false;
  const twicOk = !!driver.driver?.twic && expiryStatus(driver.driver.twic.expiry) !== "expired";
  return [
    { label: `CDL-${lic?.class ?? "A"}`, ok: licOk, detail: lic ? `valid to ${fmtDate(lic.expiry)}` : "no licence on file" },
    { label: "TWIC", ok: twicOk, detail: driver.driver?.twic ? `valid to ${fmtDate(driver.driver.twic.expiry)}` : "not on file" },
    {
      label: "Hazmat endorsement",
      ok: needsHazmat ? hasHazmat : true,
      detail: needsHazmat ? (hasHazmat ? "present" : "required for this load") : "not required",
    },
    { label: "Medical cert", ok: medOk, detail: `valid to ${fmtDate(driver.driver?.medicalCertExpiry)}` },
  ];
}

export function AssignDriverDialog({
  load,
  drivers,
  onClose,
}: {
  load: Load;
  drivers: Driver[];
  onClose: () => void;
}) {
  const bump = useDataVersion((s) => s.bump);
  const available = drivers.filter((d) => d.driver?.status === "AVAILABLE" || d.driver?.status === "ON_LOAD");
  const [selectedId, setSelectedId] = useState<string | null>(available[0]?.id ?? null);
  const [busy, setBusy] = useState(false);

  const driver = drivers.find((d) => d.id === selectedId);
  const checks = driver ? buildChecks(driver, load) : [];
  const blocked = checks.some((c) => !c.ok);
  const deadheadMi = driver?.driver?.lastPing ? Math.round(40 + Math.random() * 260) : null;

  const assign = async () => {
    if (!driver) return;
    setBusy(true);
    await api.assignDriver(load.id, driver.id);
    setBusy(false);
    bump();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[var(--radius)] bg-white shadow-[var(--d2d-shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--d2d-line)] px-5 py-3">
          <h2 className="font-display text-title">Assign driver to {load.id}</h2>
          <button onClick={onClose} className="text-[var(--d2d-ink-faint)] hover:text-[var(--d2d-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-0 sm:grid-cols-2">
          {/* Driver picker */}
          <div className="max-h-80 overflow-y-auto border-r border-[var(--d2d-line)] d2d-scroll">
            {available.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 border-b border-[var(--d2d-line)] px-3 py-2.5 text-left hover:bg-[var(--d2d-surface-sunk)]",
                  selectedId === d.id && "bg-[var(--d2d-primary-tint)]"
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--d2d-primary)] text-[11px] font-medium text-white">
                  {d.name.split(" ").map((p) => p[0]).join("")}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-medium">{d.name}</p>
                  <p className="flex items-center gap-1 text-[11px] text-[var(--d2d-ink-soft)]">
                    <Star className="h-3 w-3 fill-[var(--d2d-signal)] text-[var(--d2d-signal)]" />
                    {d.driver?.rating} · {d.driver?.status === "AVAILABLE" ? "Available" : "On load"}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Qualification check */}
          <div className="p-4">
            {driver ? (
              <>
                <p className="mb-2 text-body-sm font-medium">{driver.name}</p>
                <ul className="space-y-1.5">
                  {checks.map((c) => (
                    <li key={c.label} className="flex items-center gap-2 text-body-sm">
                      {c.ok ? (
                        <Check className="h-4 w-4 shrink-0 text-[var(--d2d-success)]" />
                      ) : (
                        <X className="h-4 w-4 shrink-0 text-[var(--d2d-danger)]" />
                      )}
                      <span className={cn(!c.ok && "font-medium text-[var(--d2d-danger)]")}>
                        {c.label} <span className="text-[var(--d2d-ink-soft)]">{c.detail}</span>
                      </span>
                    </li>
                  ))}
                  {deadheadMi != null && (
                    <li className="flex items-center gap-2 text-body-sm text-[var(--d2d-warning)]">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Driver is {deadheadMi} mi from pickup — est. deadhead
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <p className="text-body-sm text-[var(--d2d-ink-soft)]">Select a driver to run checks.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--d2d-line)] px-5 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={assign} disabled={!driver || blocked || busy}>
            {blocked ? "Qualification failed" : "Assign driver"}
          </Button>
        </div>
      </div>
    </div>
  );
}
