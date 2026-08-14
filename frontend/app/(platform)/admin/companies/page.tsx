"use client";

import { useState } from "react";
import { Building2, Plus, X, Check, XCircle, Eye, EyeOff, MapPin, List } from "lucide-react";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { PageHeader } from "@/components/shell/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, TableSkeleton } from "@/components/data/states";
import { fmtCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CompanyType, Company } from "@/types";
import { toast } from "react-toastify";

const TYPE_LABEL: Record<CompanyType, string> = {
  CARRIER: "Carrier",
  BROKER: "Broker",
  SHIPPER_RECEIVER: "Shipper / Receiver",
};

const PLAN_LABEL: Record<Company["plan"], string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  ENTERPRISE: "Enterprise",
};

const STATUS_CONFIG: Record<NonNullable<Company["status"]>, { label: string; color: string }> = {
  PENDING: { label: "Pending", color: "text-[var(--d2d-warning)]" },
  ACTIVE: { label: "Active", color: "text-[var(--d2d-success)]" },
  SUSPENDED: { label: "Suspended", color: "text-[var(--d2d-error)]" },
  TRIAL: { label: "Trial", color: "text-[var(--d2d-primary)]" },
  DECLINED: { label: "Declined", color: "text-[var(--d2d-ink-faint)]" },
};

const inputCls =
  "h-9 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] px-3 text-body-sm outline-none focus:border-[var(--d2d-primary)]";

export default function CompaniesPage() {
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [version, setVersion] = useState(0);
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: "approve" | "decline" | "toggle"; companyId: string; companyName: string; newStatus?: Company["status"] } | null>(null);
  const [branchesModalOpen, setBranchesModalOpen] = useState(false);
  const [selectedCompanyForBranches, setSelectedCompanyForBranches] = useState<Company | null>(null);
  const { data: companies, loading, error, retry } = useAsync(() => api.getCompanies(), [version]);

  const handleApprove = async (companyId: string, companyName: string) => {
    setConfirmAction({ type: "approve", companyId, companyName });
  };

  const handleDecline = async (companyId: string, companyName: string) => {
    setConfirmAction({ type: "decline", companyId, companyName });
  };

  const handleToggleStatus = async (companyId: string, companyName: string, currentStatus: Company["status"]) => {
    const newStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setConfirmAction({ type: "toggle", companyId, companyName, newStatus });
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setEditOpen(true);
  };

  const handleViewBranches = (company: Company) => {
    setSelectedCompanyForBranches(company);
    setBranchesModalOpen(true);
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    setActioning(confirmAction.companyId);
    try {
      if (confirmAction.type === "approve") {
        await api.approveCompany(confirmAction.companyId);
      } else if (confirmAction.type === "decline") {
        await api.declineCompany(confirmAction.companyId);
      } else if (confirmAction.type === "toggle" && confirmAction.newStatus) {
        await api.updateCompany(confirmAction.companyId, { status: confirmAction.newStatus });
      }
      setVersion((v) => v + 1);
      setConfirmAction(null);
    } catch (e) {
      console.error(e);
      alert(confirmAction.type === "approve" ? "Failed to approve company" : confirmAction.type === "decline" ? "Failed to decline company" : "Failed to update company status");
    } finally {
      setActioning(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="All tenant companies across the platform."
        actions={
          <Button onClick={() => setRegisterOpen(true)}>
            <Plus className="h-4 w-4" /> Register company
          </Button>
        }
      />
      {loading ? (
        <TableSkeleton rows={10} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : (
        <Card className="overflow-hidden">
          <div className="d2d-scroll overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <caption className="sr-only">Companies</caption>
              <thead>
                <tr className="border-b border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] text-left text-label text-[var(--d2d-ink-faint)]">
                  <th scope="col" className="px-4 py-2.5">Company</th>
                  <th scope="col" className="px-4 py-2.5">Type</th>
                  <th scope="col" className="px-4 py-2.5">Branches</th>
                  <th scope="col" className="px-4 py-2.5">Plan</th>
                  <th scope="col" className="px-4 py-2.5 text-right">MRR</th>
                  <th scope="col" className="px-4 py-2.5">Status</th>
                  <th scope="col" className="px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(companies ?? []).map((c) => {
                  const status = c.status ?? "ACTIVE";
                  const config = STATUS_CONFIG[status];
                  const isPending = status === "PENDING";
                  return (
                    <tr key={c.id} className="border-b border-[var(--d2d-line)] hover:bg-[var(--d2d-surface-sunk)]">
                      <td className="px-4 py-2.5 font-medium text-[var(--d2d-ink)]">{c.name}</td>
                      <td className="px-4 py-2.5 text-[var(--d2d-ink-soft)]">{TYPE_LABEL[c.type]}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px]">{c.branches.length}</td>
                      <td className="px-4 py-2.5 text-[var(--d2d-ink-soft)]">{PLAN_LABEL[c.plan]}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{fmtCurrency(c.mrrUsd ?? 0)}</td>
                      <td className={cn("px-4 py-2.5", config.color)}>{config.label}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(c.id, c.name)}
                                disabled={actioning === c.id}
                                className="rounded-md bg-[var(--d2d-success-tint)] p-1.5 text-[var(--d2d-success)] hover:bg-[var(--d2d-success)] hover:text-white disabled:opacity-50"
                                title="Approve"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDecline(c.id, c.name)}
                                disabled={actioning === c.id}
                                className="rounded-md bg-[var(--d2d-error-tint)] p-1.5 text-[var(--d2d-error)] hover:bg-[var(--d2d-error)] hover:text-white disabled:opacity-50"
                                title="Decline"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {!isPending && (
                            <button
                              onClick={() => handleToggleStatus(c.id, c.name, c.status)}
                              disabled={actioning === c.id}
                              className={cn(
                                "rounded-md p-1.5 hover:text-white disabled:opacity-50",
                                c.status === "ACTIVE"
                                  ? "bg-[var(--d2d-error-tint)] text-[var(--d2d-error)] hover:bg-[var(--d2d-error)]"
                                  : "bg-[var(--d2d-success-tint)] text-[var(--d2d-success)] hover:bg-[var(--d2d-success)]"
                              )}
                              title={c.status === "ACTIVE" ? "Suspend" : "Activate"}
                            >
                              {c.status === "ACTIVE" ? <XCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(c)}
                            disabled={actioning === c.id}
                            className="rounded-md bg-[var(--d2d-primary-tint)] p-1.5 text-[var(--d2d-primary)] hover:bg-[var(--d2d-primary)] hover:text-white disabled:opacity-50"
                            title="Edit"
                          >
                            <Building2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleViewBranches(c)}
                            disabled={actioning === c.id}
                            className="rounded-md bg-[var(--d2d-surface-sunk)] p-1.5 text-[var(--d2d-ink-soft)] hover:bg-[var(--d2d-line)] hover:text-[var(--d2d-ink)] disabled:opacity-50"
                            title="View branches"
                          >
                            <List className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {registerOpen && (
        <RegisterDialog
          onClose={() => setRegisterOpen(false)}
          onSuccess={() => {
            setVersion((v) => v + 1);
            setRegisterOpen(false);
          }}
        />
      )}

      {editOpen && editingCompany && (
        <EditDialog
          company={editingCompany}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setVersion((v) => v + 1);
            setEditOpen(false);
          }}
        />
      )}

      {branchesModalOpen && selectedCompanyForBranches && (
        <BranchesModal
          company={selectedCompanyForBranches}
          onClose={() => {
            setBranchesModalOpen(false);
            setSelectedCompanyForBranches(null);
          }}
        />
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[var(--radius)] bg-white shadow-[var(--d2d-shadow)]">
            <div className="flex items-center justify-between border-b border-[var(--d2d-line)] px-5 py-3">
              <h2 className="font-display text-title">
                {confirmAction.type === "approve" ? "Approve company" : confirmAction.type === "decline" ? "Decline company" : confirmAction.newStatus === "ACTIVE" ? "Activate company" : "Suspend company"}
              </h2>
              <button onClick={() => setConfirmAction(null)} className="text-[var(--d2d-ink-faint)] hover:text-[var(--d2d-ink)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-body-sm text-[var(--d2d-ink)]">
                {confirmAction.type === "approve"
                  ? `Are you sure you want to approve ${confirmAction.companyName}? This will allow them to use the platform.`
                  : confirmAction.type === "decline"
                  ? `Are you sure you want to decline ${confirmAction.companyName}? This will reject their registration.`
                  : confirmAction.newStatus === "ACTIVE"
                  ? `Are you sure you want to activate ${confirmAction.companyName}? This will allow them to use the platform.`
                  : `Are you sure you want to suspend ${confirmAction.companyName}? This will prevent them from using the platform.`}
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--d2d-line)] px-5 py-3">
              <Button variant="ghost" onClick={() => setConfirmAction(null)} disabled={actioning === confirmAction.companyId}>
                Cancel
              </Button>
              <Button
                onClick={executeAction}
                disabled={actioning === confirmAction.companyId}
                variant={confirmAction.type === "approve" || confirmAction.newStatus === "ACTIVE" ? "primary" : "danger"}
              >
                {actioning === confirmAction.companyId ? "Processing..." : confirmAction.type === "approve" ? "Approve" : confirmAction.type === "decline" ? "Decline" : confirmAction.newStatus === "ACTIVE" ? "Activate" : "Suspend"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditDialog({ company, onClose, onSuccess }: { company: Company; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState(company.name);
  const [type, setType] = useState<CompanyType>(company.type);
  const [plan, setPlan] = useState<Company["plan"]>(company.plan);
  const [status, setStatus] = useState<Company["status"]>(company.status);
  const [dotNumber, setDotNumber] = useState(company.dotNumber || "");
  const [mcNumber, setMcNumber] = useState(company.mcNumbers?.[0] || "");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name) return;
    setSubmitting(true);
    try {
      await api.updateCompany(company.id, { name, type, plan, status, dotNumber, mcNumbers: mcNumber ? [mcNumber] : undefined });
      onSuccess();
    } catch (e) {
      console.error(e);
      alert("Failed to update company");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[var(--radius)] bg-white shadow-[var(--d2d-shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--d2d-line)] px-5 py-3">
          <h2 className="font-display text-title flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--d2d-primary)]" />
            Edit company
          </h2>
          <button onClick={onClose} className="text-[var(--d2d-ink-faint)] hover:text-[var(--d2d-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">Company name</span>
              <input className={cn(inputCls, "mt-1")} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">Type</span>
              <select disabled={true} className={cn(inputCls, "mt-1")} value={type} onChange={(e) => setType(e.target.value as CompanyType)}>
                <option value="CARRIER">Carrier</option>
                <option value="BROKER">Broker</option>
                <option value="SHIPPER_RECEIVER">Shipper / Receiver</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">Plan</span>
              <select className={cn(inputCls, "mt-1")} value={plan} onChange={(e) => setPlan(e.target.value as Company["plan"])}>
                <option value="STARTER">Starter ($1,200/mo)</option>
                <option value="GROWTH">Growth ($3,500/mo)</option>
                <option value="ENTERPRISE">Enterprise ($9,800/mo)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">Status</span>
              <select className={cn(inputCls, "mt-1")} value={status} onChange={(e) => setStatus(e.target.value as Company["status"])}>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="TRIAL">Trial</option>
                <option value="DECLINED">Declined</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">DOT Number</span>
              <input className={cn(inputCls, "mt-1")} value={dotNumber} onChange={(e) => setDotNumber(e.target.value)} placeholder="1234567" />
            </label>
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">MC Number</span>
              <input className={cn(inputCls, "mt-1")} value={mcNumber} onChange={(e) => setMcNumber(e.target.value)} placeholder="MC-123456" />
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--d2d-line)] px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={!name || submitting}>
            {submitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RegisterDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CompanyType>("CARRIER");
  const [plan, setPlan] = useState<Company["plan"]>("STARTER");
  const [branchCity, setBranchCity] = useState("");
  const [branchState, setBranchState] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name || !branchCity || !branchState || !adminName || !adminEmail || !adminPassword) return;
    setSubmitting(true);
    try {
      await api.createCompany(name, type, plan, branchCity, branchState, adminName, adminEmail, "ACTIVE", undefined, undefined, undefined, adminPassword);
      onSuccess();
      toast.success("Company created successfully");
    } catch (e) {
      console.error(e);
      toast.error((e as Error)?.message || "Failed to create company");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[var(--radius)] bg-white shadow-[var(--d2d-shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--d2d-line)] px-5 py-3">
          <h2 className="font-display text-title flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--d2d-primary)]" />
            Register company
          </h2>
          <button onClick={onClose} className="text-[var(--d2d-ink-faint)] hover:text-[var(--d2d-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">Company name</span>
              <input className={cn(inputCls, "mt-1")} value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Logistics" />
            </label>
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">Type</span>
              <select className={cn(inputCls, "mt-1")} value={type} onChange={(e) => setType(e.target.value as CompanyType)}>
                <option value="CARRIER">Carrier</option>
                <option value="BROKER">Broker</option>
                <option value="SHIPPER_RECEIVER">Shipper / Receiver</option>
              </select>
            </label>
          </div>
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Plan</span>
            <select className={cn(inputCls, "mt-1")} value={plan} onChange={(e) => setPlan(e.target.value as Company["plan"])}>
              <option value="STARTER">Starter ($1,200/mo)</option>
              <option value="GROWTH">Growth ($3,500/mo)</option>
              <option value="ENTERPRISE">Enterprise ($9,800/mo)</option>
            </select>
          </label>
          <div className="border-t border-[var(--d2d-line)] pt-4">
            <p className="text-label text-[var(--d2d-ink-soft)] mb-3">Corporate branch (HQ)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-label text-[var(--d2d-ink-soft)]">City</span>
                <input className={cn(inputCls, "mt-1")} value={branchCity} onChange={(e) => setBranchCity(e.target.value)} placeholder="Dallas" />
              </label>
              <label className="block">
                <span className="text-label text-[var(--d2d-ink-soft)]">State</span>
                <input className={cn(inputCls, "mt-1")} value={branchState} onChange={(e) => setBranchState(e.target.value)} placeholder="TX" maxLength={2} />
              </label>
            </div>
          </div>
          <div className="border-t border-[var(--d2d-line)] pt-4">
            <p className="text-label text-[var(--d2d-ink-soft)] mb-3">First admin user</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-label text-[var(--d2d-ink-soft)]">Name</span>
                <input className={cn(inputCls, "mt-1")} value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Jordan Lee" />
              </label>
              <label className="block">
                <span className="text-label text-[var(--d2d-ink-soft)]">Email</span>
                <input className={cn(inputCls, "mt-1")} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="jordan@acme.com" type="email" />
              </label>
            </div>
            <label className="block mt-4">
              <span className="text-label text-[var(--d2d-ink-soft)]">Password</span>
              <div className="relative mt-1">
                <input
                  className={cn(inputCls)}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
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
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--d2d-line)] px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={!name || !branchCity || !branchState || !adminName || !adminEmail || !adminPassword || submitting}>
            {submitting ? "Registering..." : "Register company"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function BranchesModal({ company, onClose }: { company: Company; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[var(--radius)] bg-white shadow-[var(--d2d-shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--d2d-line)] px-5 py-3">
          <h2 className="font-display text-title flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[var(--d2d-primary)]" />
            {company.name} - Branches
          </h2>
          <button onClick={onClose} className="text-[var(--d2d-ink-faint)] hover:text-[var(--d2d-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          {company.branches.length === 0 ? (
            <p className="text-body-sm text-[var(--d2d-ink-soft)]">No branches found for this company.</p>
          ) : (
            <div className="space-y-3">
              {company.branches.map((branch) => (
                <div key={branch.id} className="flex items-center gap-3 rounded-md border border-[var(--d2d-line)] p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--d2d-primary-tint)] text-[var(--d2d-primary)]">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-[var(--d2d-ink)]">{branch.name}</p>
                    <p className="flex items-center gap-1 text-[12px] text-[var(--d2d-ink-soft)]">
                      <MapPin className="h-3 w-3" /> {branch.city}, {branch.state} ·{" "}
                      {branch.level === "CORPORATE" ? "Corporate" : "Satellite"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end border-t border-[var(--d2d-line)] px-5 py-3">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
