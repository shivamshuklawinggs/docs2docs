"use client";

import { useState } from "react";
import { Star, Plus, X, Eye, EyeOff } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/data/states";
import { expiryStatus, fmtDate, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Driver } from "@/types";

const STATUS_STYLE: Record<Driver["driver"]["status"], string> = {
  AVAILABLE: "text-[var(--d2d-success)]",
  ON_LOAD: "text-[var(--d2d-primary)]",
  OFF_DUTY: "text-[var(--d2d-ink-soft)]",
  INACTIVE: "text-[var(--d2d-ink-faint)]",
};
const STATUS_LABEL: Record<Driver["driver"]["status"], string> = {
  AVAILABLE: "Available",
  ON_LOAD: "On load",
  OFF_DUTY: "Off duty",
  INACTIVE: "Inactive",
};

function ExpiryCell({ iso }: { iso: string }) {
  const status = expiryStatus(iso);
  return (
    <span
      className={cn(
        "font-mono text-[12px]",
        status === "expired" && "font-medium text-[var(--d2d-danger)]",
        status === "expiring" && "font-medium text-[var(--d2d-warning)]",
        status === "ok" && "text-[var(--d2d-ink-soft)]"
      )}
    >
      {fmtDate(iso)}
    </span>
  );
}

export default function DriversPage() {
  const scope = useSession((s) => s.scope);
  const user = useSession((s) => s.user);
  const [addOpen, setAddOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const { data: drivers, loading, error, retry } = useAsync(
    () => api.getDrivers(scope!),
    [scope?.branchId, scope?.role, version]
  );

  if (!scope) return null;

  return (
    <div>
      <PageHeader
        title="Drivers"
        subtitle="Roster, availability and compliance across the fleet."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add driver
          </Button>
        }
      />
      {loading ? (
        <TableSkeleton rows={10} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : !drivers || drivers.length === 0 ? (
        <EmptyState
          title="No drivers in this branch"
          body="Drivers assigned to this branch will appear here with live availability and document status."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="d2d-scroll overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <caption className="sr-only">Driver roster</caption>
              <thead>
                <tr className="border-b border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] text-left text-label text-[var(--d2d-ink-faint)]">
                  <th scope="col" className="px-4 py-2.5">Driver</th>
                  <th scope="col" className="px-4 py-2.5">Status</th>
                  <th scope="col" className="px-4 py-2.5">Licence exp.</th>
                  <th scope="col" className="px-4 py-2.5">Medical exp.</th>
                  <th scope="col" className="px-4 py-2.5">Rating</th>
                  <th scope="col" className="px-4 py-2.5">Last ping</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  <tr key={d.id} className="border-b border-[var(--d2d-line)] hover:bg-[var(--d2d-surface-sunk)]">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--d2d-primary)] text-[11px] font-medium text-white">
                          {d.name.split(" ").map((p) => p[0]).join("")}
                        </span>
                        <div>
                          <p className="font-medium text-[var(--d2d-ink)]">{d.name}</p>
                          <p className="font-mono text-[11px] text-[var(--d2d-ink-faint)]">
                            {d.driver?.endorsements?.join(" · ")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={cn("px-4 py-2.5 font-medium", STATUS_STYLE[d.driver?.status])}>
                      {STATUS_LABEL[d.driver?.status]}
                    </td>
                    <td className="px-4 py-2.5">
                      <ExpiryCell iso={d.driver?.licenses?.[0]?.expiry ?? ""} />
                    </td>
                    <td className="px-4 py-2.5">
                      <ExpiryCell iso={d.driver?.medicalCertExpiry ?? ""} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1 text-[var(--d2d-ink-soft)]">
                        <Star className="h-3 w-3 fill-[var(--d2d-signal)] text-[var(--d2d-signal)]" />
                        {d.driver?.rating}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--d2d-ink-soft)]">
                      {d.driver?.lastPing ? fmtRelative(d.driver.lastPing.at) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {addOpen && user && (
        <AddDriverDialog
          companyId={user.companyId}
          branchId={scope.branchId}
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setVersion((v) => v + 1);
            setAddOpen(false);
          }}
        />
      )}
    </div>
  );
}

function AddDriverDialog({ companyId, branchId, onClose, onSuccess }: { companyId: string; branchId: string; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name || !email || !phone || !password) return;
    setSubmitting(true);
    try {
      await api.createDriver(name, email, phone, password, companyId, branchId);
      onSuccess();
    } catch (e) {
      console.error(e);
      alert("Failed to add driver");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[var(--radius)] bg-[var(--d2d-surface)] shadow-lg">
        <div className="flex items-center justify-between border-b border-[var(--d2d-line)] px-5 py-3">
          <h3 className="font-display text-title font-medium text-[var(--d2d-ink)]">Add Driver</h3>
          <button onClick={onClose} className="text-[var(--d2d-ink-soft)] hover:text-[var(--d2d-ink)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Driver name</span>
            <input
              className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </label>
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Email</span>
            <input
              type="email"
              className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
            />
          </label>
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Phone</span>
            <input
              type="tel"
              className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </label>
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Password</span>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 pr-10 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--d2d-ink-soft)] hover:text-[var(--d2d-ink)]"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--d2d-line)] px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={!name || !email || !phone || !password || submitting}>
            {submitting ? "Adding..." : "Add driver"}
          </Button>
        </div>
      </div>
    </div>
  );
}
