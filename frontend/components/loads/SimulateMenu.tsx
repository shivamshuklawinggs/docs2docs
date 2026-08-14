"use client";

import { useState, useRef, useEffect } from "react";
import { FlaskConical, ChevronDown, ArrowRight, MapPin, Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/mock/api";
import { useSession } from "@/lib/store/session";
import { useDataVersion } from "@/lib/store/data";
import { nextStatus } from "@/lib/lifecycle";
import type { LoadStatus } from "@/types";

// Demo-only Simulate menu on the load detail page (spec §7.3).
export function SimulateMenu({ loadId, status }: { loadId: string; status: LoadStatus }) {
  const demoMode = useSession((s) => s.demoMode);
  const bump = useDataVersion((s) => s.bump);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!demoMode) return null;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
    setOpen(false);
    bump();
  };

  const canAdvance = !!nextStatus(status);

  return (
    <div className="relative" ref={ref}>
      <Button variant="outline" onClick={() => setOpen((o) => !o)} disabled={busy}>
        <FlaskConical className="h-4 w-4 text-[var(--d2d-signal)]" />
        Simulate
        <ChevronDown className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-60 rounded-[var(--radius)] border border-[var(--d2d-line)] bg-white py-1 shadow-[var(--d2d-shadow)]">
          <MenuItem
            icon={ArrowRight}
            label="Advance to next step"
            disabled={!canAdvance}
            onClick={() => run(() => api.advanceLoad(loadId))}
          />
          <MenuItem
            icon={MapPin}
            label="Trigger 5-mile arrival alert"
            onClick={() => run(() => api.triggerArrival(loadId))}
          />
          <MenuItem
            icon={Clock}
            label="Simulate 45-minute delay"
            onClick={() => run(() => api.addDelay(loadId))}
          />
          <div className="my-1 border-t border-[var(--d2d-line)]" />
          <MenuItem
            icon={RotateCcw}
            label="Reset load to draft"
            danger
            onClick={() => run(() => api.resetLoad(loadId))}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-body-sm hover:bg-[var(--d2d-surface-sunk)] disabled:opacity-40 ${
        danger ? "text-[var(--d2d-danger)]" : "text-[var(--d2d-ink)]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
