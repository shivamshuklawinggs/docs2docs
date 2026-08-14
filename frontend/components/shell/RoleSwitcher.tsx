"use client";

// Demo-only Role Switcher — floating pill, bottom-right (spec §6.1).
// Removed in Phase 2; kept isolated in this one file.
import { useState } from "react";
import { FlaskConical, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/store/session";
import { ROLE_LABEL } from "@/lib/rbac";
import type { Role } from "@/types";

const ROLES: Role[] = [
  "SUPER_ADMIN",
  "CARRIER_CORP",
  "CARRIER_BRANCH",
  "BROKER_CORP",
  "BROKER_BRANCH",
  "SHIPPER_RECEIVER",
];

export function RoleSwitcher() {
  const { role, demoMode, setRole } = useSession();
  const [open, setOpen] = useState(false);

  if (!demoMode || !role) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-2 w-60 overflow-hidden rounded-[var(--radius)] border border-[var(--d2d-line)] bg-white shadow-[var(--d2d-shadow)]">
          <p className="border-b border-[var(--d2d-line)] px-3 py-2 text-label text-[var(--d2d-ink-faint)]">
            Switch role
          </p>
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => {
                setRole(r);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-3 py-2 text-left text-body-sm hover:bg-[var(--d2d-surface-sunk)]",
                r === role && "bg-[var(--d2d-primary-tint)] font-medium text-[var(--d2d-primary)]"
              )}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full bg-[var(--d2d-ink)] px-4 py-2.5 text-body-sm font-medium text-white shadow-lg hover:bg-black"
      >
        <FlaskConical className="h-4 w-4 text-[var(--d2d-signal)]" />
        <span className="font-mono text-[11px] uppercase tracking-wide text-[var(--d2d-signal)]">
          Demo
        </span>
        <span className="max-w-32 truncate">{ROLE_LABEL[role]}</span>
        <ChevronUp className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
}
