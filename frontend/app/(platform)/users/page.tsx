"use client";

import { useState } from "react";
import { UserPlus, X, Check, Minus, Eye, EyeOff } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { useDataVersion } from "@/lib/store/data";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/data/states";
import { PermissionGate } from "@/components/shell/PermissionGate";
import { ROLE_LABEL, can } from "@/lib/rbac";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Permission, Role } from "@/types";

const ALL_PERMISSIONS: { key: Permission; label: string }[] = [
  { key: "view:margin", label: "View margin" },
  { key: "manage:users", label: "Manage users" },
  { key: "manage:billing", label: "Manage billing" },
  { key: "manage:branches", label: "Manage branches" },
  { key: "assign:driver", label: "Assign drivers" },
  { key: "sign:documents", label: "Sign documents" },
  { key: "create:order", label: "Create orders" },
  { key: "dispatch:load", label: "Dispatch loads" },
];

const ROLES_BY_COMPANY: Record<string, Role[]> = {
  CARRIER: ["CARRIER_CORP", "CARRIER_BRANCH"],
  BROKER: ["BROKER_CORP", "BROKER_BRANCH"],
  SHIPPER_RECEIVER: ["SHIPPER_RECEIVER"],
};

const inputCls =
  "h-9 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] px-3 text-body-sm outline-none focus:border-[var(--d2d-primary)]";

export default function UsersPage() {
  const { scope, user } = useSession();
  const version = useDataVersion((s) => s.version);
  const bump = useDataVersion((s) => s.bump);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [previewRole, setPreviewRole] = useState<Role | null>(null);
  const { data: users, loading, error, retry } = useAsync(
    () => api.getUsers(scope!),
    [scope?.branchId, scope?.role, version]
  );
  const { data: companies } = useAsync(() => api.getCompanies(), [version]);
  const { data: branches } = useAsync(() => user && scope ? api.getBranches(scope) : Promise.resolve([]), [user?.companyId, scope?.branchId, version]);

  if (!scope || !user) return null;

  const company = companies?.find((c) => c.id === user.companyId);
  const roleOptions = company ? ROLES_BY_COMPANY[company.type] ?? [] : [];
  const rows = users ?? [];
  const branchName = (id: string) =>
    id === "ALL" ? "All branches" : branches?.find((b) => b.id === id)?.name ?? id;

  return (
    <div>
      <PageHeader
        title="Users & permissions"
        subtitle="Invite users, assign roles and branches, preview what each role can see."
        actions={
          <PermissionGate action="manage:users">
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" /> Invite user
            </Button>
          </PermissionGate>
        }
      />

      {loading ? (
        <TableSkeleton rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : rows.length === 0 ? (
        <EmptyState title="No users in this scope" body="Invite teammates to give them access to this workspace." />
      ) : (
        <Card className="overflow-hidden">
          <div className="d2d-scroll overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <caption className="sr-only">Users</caption>
              <thead>
                <tr className="border-b border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] text-left text-label text-[var(--d2d-ink-faint)]">
                  <th scope="col" className="px-4 py-2.5">Name</th>
                  <th scope="col" className="px-4 py-2.5">Email</th>
                  <th scope="col" className="px-4 py-2.5">Role</th>
                  <th scope="col" className="px-4 py-2.5">Branch</th>
                  <th scope="col" className="px-4 py-2.5">Last active</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--d2d-line)] hover:bg-[var(--d2d-surface-sunk)]">
                    <td className="px-4 py-2.5 font-medium text-[var(--d2d-ink)]">{u.name}</td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--d2d-ink-soft)]">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => setPreviewRole(u.role)}
                        className="rounded-[var(--radius)] bg-[var(--d2d-primary-tint)] px-2 py-0.5 text-[12px] font-medium text-[var(--d2d-primary)] hover:opacity-80"
                      >
                        {ROLE_LABEL[u.role]}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--d2d-ink-soft)]">
                      {u.branchIds.includes("ALL") ? "All branches" : u.branchIds.map(branchName).join(", ")}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--d2d-ink-faint)]">
                      {u.lastActive ? fmtRelative(u.lastActive) : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {inviteOpen && company && branches && (
        <InviteDialog
          companyId={company.id}
          branches={branches}
          roleOptions={roleOptions}
          onClose={() => setInviteOpen(false)}
          onSuccess={() => {
            bump();
            setInviteOpen(false);
          }}
        />
      )}

      {previewRole && <PermissionPreview role={previewRole} onClose={() => setPreviewRole(null)} />}
    </div>
  );
}

function InviteDialog({
  companyId,
  branches,
  roleOptions,
  onClose,
  onSuccess,
}: {
  companyId: string;
  branches: { id: string; name: string }[];
  roleOptions: Role[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>(roleOptions[0]);
  const [branchId, setBranchId] = useState<string>(branches[0]?.id ?? "ALL");
  const [submitting, setSubmitting] = useState(false);
  const isCorp = role.endsWith("CORP") || role === "SHIPPER_RECEIVER";

  const submit = async () => {
    if (!name || !email || !password) return;
    setSubmitting(true);
    try {
      await api.createUser(name, email, password, role, companyId, isCorp ? ["ALL"] : [branchId], []);
      onSuccess();
    } catch (e) {
      console.error(e);
      alert("Failed to create user");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-[var(--radius)] bg-white shadow-[var(--d2d-shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--d2d-line)] px-5 py-3">
          <h2 className="font-display text-title">Invite user</h2>
          <button onClick={onClose} className="text-[var(--d2d-ink-faint)] hover:text-[var(--d2d-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Name</span>
            <input className={cn(inputCls, "mt-1")} value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" />
          </label>
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Email</span>
            <input className={cn(inputCls, "mt-1")} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@company.com" type="email" />
          </label>
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Password</span>
            <div className="relative mt-1">
              <input
                className={cn(inputCls)}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
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
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Role</span>
            <select className={cn(inputCls, "mt-1")} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {roleOptions.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}</option>
              ))}
            </select>
          </label>
          {!isCorp && (
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">Branch</span>
              <select className={cn(inputCls, "mt-1")} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--d2d-line)] px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={!name || !email || !password || submitting}>
            {submitting ? "Creating..." : "Send invite"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PermissionPreview({ role, onClose }: { role: Role; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-[var(--radius)] bg-white shadow-[var(--d2d-shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--d2d-line)] px-5 py-3">
          <h2 className="font-display text-title">{ROLE_LABEL[role]}</h2>
          <button onClick={onClose} className="text-[var(--d2d-ink-faint)] hover:text-[var(--d2d-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="space-y-2 p-5">
          {ALL_PERMISSIONS.map((p) => {
            const granted = can(role, p.key);
            return (
              <li key={p.key} className="flex items-center gap-2 text-body-sm">
                {granted ? (
                  <Check className="h-4 w-4 text-[var(--d2d-success)]" />
                ) : (
                  <Minus className="h-4 w-4 text-[var(--d2d-ink-faint)]" />
                )}
                <span className={granted ? "text-[var(--d2d-ink)]" : "text-[var(--d2d-ink-faint)]"}>{p.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
