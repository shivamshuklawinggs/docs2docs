"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Plus, X } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { useDataVersion } from "@/lib/store/data";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/data/states";
import { fmtPercent } from "@/lib/format";
import type { Branch } from "@/types";

export default function BranchesPage() {
  const router = useRouter();
  const { scope, user } = useSession();
  const version = useDataVersion((s) => s.version);
  const bump = useDataVersion((s) => s.bump);
  const [createOpen, setCreateOpen] = useState(false);
  
  const { data: loads, loading, error, retry } = useAsync(
    () => api.getLoads({}, { ...scope!, branchId: "ALL" }),
    [scope?.role, version]
  );
  
  // SUPER_ADMIN sees all branches, regular users see their company's branches
  const { data: branchList } = useAsync(
    () => {
      if (user && scope) {
        if (user.role === "SUPER_ADMIN") {
          // Superadmin sees all branches
          return api.getBranches({ companyId: "ALL", branchId: "ALL", role: "SUPER_ADMIN" });
        }
        return api.getBranches(scope);
      }
      return Promise.resolve([]);
    },
    [user?.companyId, user?.role, scope?.branchId, scope?.role, version]
  );
  
  const { data: users } = useAsync(() => scope ? api.getUsers(scope) : Promise.resolve([]), [scope?.branchId, scope?.role, version]);

  if (!scope || !user) return null;

  const branches = branchList ?? [];
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  if (loading) return <TableSkeleton rows={6} />;
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (branches.length === 0 && !createOpen) {
    return (
      <div>
        <PageHeader
          title="Branches"
          subtitle="Corporate HQ and satellite offices, each with its own scoped KPIs."
          actions={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create branch
            </Button>
          }
        />
        <EmptyState title="No branches" body="Satellite offices for this company will appear here." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Branches"
        subtitle={isSuperAdmin 
          ? "All branches across all companies on the platform" 
          : "Corporate HQ and satellite offices, each with its own scoped KPIs."
        }
        actions={
          !isSuperAdmin && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create branch
            </Button>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => {
          const branchLoads = (loads ?? []).filter((l) => l.branchId === b.id);
          const active = branchLoads.filter((l) => !["PAID", "CANCELLED"].includes(l.status));
          const onTimeCount = branchLoads.filter((l) => l.onTime).length;
          const onTimePct = branchLoads.length ? (onTimeCount / branchLoads.length) * 100 : 0;
          const userCount = (users ?? []).filter(
            (u) => u.companyId === user.companyId && (u.branchIds.includes("ALL") || u.branchIds.includes(b.id))
          ).length;
          return (
            <Card key={b.id} className="cursor-pointer" onClick={() => router.push("/users")}>
              <CardContent className="pt-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--d2d-primary-tint)] text-[var(--d2d-primary)]">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium text-[var(--d2d-ink)]">{b.name}</p>
                    <p className="flex items-center gap-1 text-[12px] text-[var(--d2d-ink-soft)]">
                      <MapPin className="h-3 w-3" /> {b.city}, {b.state} ·{" "}
                      {b.level === "CORPORATE" ? "Corporate" : "Satellite"}
                    </p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--d2d-line)] pt-3 text-center">
                  <div>
                    <dd className="font-display text-title text-[var(--d2d-ink)]">{active.length}</dd>
                    <dt className="text-[11px] text-[var(--d2d-ink-faint)]">Active loads</dt>
                  </div>
                  <div>
                    <dd className="font-display text-title text-[var(--d2d-ink)]">{fmtPercent(onTimePct, 0)}</dd>
                    <dt className="text-[11px] text-[var(--d2d-ink-faint)]">On-time</dt>
                  </div>
                  <div>
                    <dd className="font-display text-title text-[var(--d2d-ink)]">{userCount}</dd>
                    <dt className="text-[11px] text-[var(--d2d-ink-faint)]">Users</dt>
                  </div>
                </dl>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {createOpen && (
        <CreateBranchDialog
          companyId={user.companyId}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            bump();
            setCreateOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CreateBranchDialog({ companyId, onClose, onSuccess }: { companyId: string; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [level, setLevel] = useState<Branch["level"]>("SATELLITE");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name || !city || !state) return;
    setSubmitting(true);
    try {
      await api.createBranch(companyId, name, city, state, level);
      onSuccess();
    } catch (e) {
      console.error(e);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[var(--radius)] bg-white shadow-[var(--d2d-shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--d2d-line)] px-5 py-3">
          <h2 className="font-display text-title flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--d2d-primary)]" />
            Create branch
          </h2>
          <button onClick={onClose} className="text-[var(--d2d-ink-faint)] hover:text-[var(--d2d-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Branch name</span>
            <input
              className="mt-1 h-9 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] px-3 text-body-sm outline-none focus:border-[var(--d2d-primary)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dallas Terminal"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">City</span>
              <input
                className="mt-1 h-9 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] px-3 text-body-sm outline-none focus:border-[var(--d2d-primary)]"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Dallas"
              />
            </label>
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">State</span>
              <input
                className="mt-1 h-9 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] px-3 text-body-sm outline-none focus:border-[var(--d2d-primary)]"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="TX"
                maxLength={2}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Branch level</span>
            <select
              className="mt-1 h-9 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] px-3 text-body-sm outline-none focus:border-[var(--d2d-primary)]"
              value={level}
              onChange={(e) => setLevel(e.target.value as Branch["level"])}
            >
              <option value="CORPORATE">Corporate (HQ)</option>
              <option value="SATELLITE">Satellite office</option>
            </select>
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--d2d-line)] px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!name || !city || !state || submitting}>
            {submitting ? "Creating..." : "Create branch"}
          </Button>
        </div>
      </div>
    </div>
  );
}
