"use client";

import { useState } from "react";
import { X, Plus, ShieldCheck, ClipboardCheck, Wrench, Image as ImageIcon, Truck, Package, CreditCard } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/data/states";
import { expiryStatus, fmtDate, fmtCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Equipment } from "@/types";

const TYPES: { key: Equipment["type"] | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "TRACTOR", label: "Tractors" },
  { key: "TRAILER", label: "Trailers" },
  { key: "CONTAINER", label: "Containers" },
  { key: "CHASSIS", label: "Chassis" },
];

function ExpiryDot({ iso, label }: { iso: string; label: string }) {
  const status = expiryStatus(iso);
  return (
    <span
      title={`${label} expires ${fmtDate(iso)}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        status === "expired" && "bg-[var(--d2d-danger-tint)] text-[var(--d2d-danger)]",
        status === "expiring" && "bg-[var(--d2d-warning-tint)] text-[var(--d2d-warning)]",
        status === "ok" && "bg-[var(--d2d-success-tint)] text-[var(--d2d-success)]"
      )}
    >
      {label}
    </span>
  );
}

export default function EquipmentPage() {
  const scope = useSession((s) => s.scope);
  const user = useSession((s) => s.user);
  const [type, setType] = useState<Equipment["type"] | "ALL">("ALL");
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [version, setVersion] = useState(0);
  const { data: equipment, loading, error, retry } = useAsync(
    () => api.getEquipment(scope!),
    [scope?.branchId, scope?.role, version]
  );

  if (!scope) return null;
  const rows = (equipment ?? []).filter((e) => type === "ALL" || e.type === type);

  return (
    <div>
      <PageHeader
        title="Equipment"
        subtitle="Tractors, trailers, containers and chassis with compliance status."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add equipment
          </Button>
        }
      />

      <div className="mb-4 flex gap-1">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={cn(
              "rounded-[var(--radius)] px-3 py-1.5 text-body-sm",
              type === t.key
                ? "bg-[var(--d2d-primary)] text-white"
                : "text-[var(--d2d-ink-soft)] hover:bg-[var(--d2d-surface-sunk)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={10} />
      ) : error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : rows.length === 0 ? (
        <EmptyState title="No equipment in this branch" body="Units assigned to this branch will appear here." />
      ) : (
        <Card className="overflow-hidden">
          <div className="d2d-scroll overflow-x-auto">
            <table className="w-full border-collapse text-body-sm">
              <caption className="sr-only">Equipment</caption>
              <thead>
                <tr className="border-b border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] text-left text-label text-[var(--d2d-ink-faint)]">
                  <th scope="col" className="px-4 py-2.5">Unit</th>
                  <th scope="col" className="px-4 py-2.5">Make / model</th>
                  <th scope="col" className="px-4 py-2.5">Plate</th>
                  <th scope="col" className="px-4 py-2.5">Insurance</th>
                  <th scope="col" className="px-4 py-2.5">Last inspection</th>
                  <th scope="col" className="px-4 py-2.5">Compliance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const lastInsp = e.inspections[0];
                  const failed = lastInsp?.result === "FAIL";
                  return (
                    <tr
                      key={e.id}
                      onClick={() => setSelected(e)}
                      className="cursor-pointer border-b border-[var(--d2d-line)] hover:bg-[var(--d2d-surface-sunk)]"
                    >
                      <td className="px-4 py-2.5 font-mono font-medium">{e.unitNumber}</td>
                      <td className="px-4 py-2.5 text-[var(--d2d-ink-soft)]">
                        {e.year} {e.make} {e.model}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12px]">
                        {e.plates[0]?.state} {e.plates[0]?.number}
                      </td>
                      <td className="px-4 py-2.5">
                        <ExpiryDot iso={e.insurance.expiry} label="Insurance" />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-[var(--d2d-ink-soft)]">
                        {lastInsp ? fmtDate(lastInsp.date) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {failed ? (
                          <span className="text-[12px] font-medium text-[var(--d2d-danger)]">Failed inspection</span>
                        ) : (
                          <span className="text-[12px] font-medium text-[var(--d2d-success)]">Compliant</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selected && <EquipmentDetail equipment={selected} onClose={() => setSelected(null)} />}

      {addOpen && user && (
        <AddEquipmentDialog
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

function AddEquipmentDialog({ branchId, onClose, onSuccess }: { branchId: string; onClose: () => void; onSuccess: () => void }) {
  const [type, setType] = useState<Equipment["type"]>("TRACTOR");
  const [unitNumber, setUnitNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [vin, setVin] = useState("");
  const [plates, setPlates] = useState<{ state: string; number: string; expiry: string }[]>([{ state: "", number: "", expiry: "" }]);
  const [dotNumber, setDotNumber] = useState("");
  const [mcNumbers, setMcNumbers] = useState<string[]>([""]);
  const [ifta, setIfta] = useState("");
  const [permits, setPermits] = useState<string[]>([""]);
  const [prePass, setPrePass] = useState("");
  const [tollAccounts, setTollAccounts] = useState<string[]>([""]);
  const [insuranceCarrier, setInsuranceCarrier] = useState("");
  const [insurancePolicy, setInsurancePolicy] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!type || !unitNumber || photos.length === 0) return;
    setSubmitting(true);
    try {
      await api.createEquipment(type, unitNumber, branchId, vin, insuranceExpiry, photos, {
        make,
        model,
        year,
        plates: plates.filter(p => p.state && p.number),
        dotNumber,
        mcNumbers: mcNumbers.filter(m => m),
        ifta,
        permits: permits.filter(p => p),
        prePass,
        tollAccounts: tollAccounts.filter(t => t),
        insurance: { carrier: insuranceCarrier, policy: insurancePolicy, expiry: insuranceExpiry },
      });
      onSuccess();
    } catch (e) {
      console.error(e);
      alert("Failed to add equipment");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-[var(--radius)] bg-[var(--d2d-surface)] shadow-lg">
        <div className="flex items-center justify-between border-b border-[var(--d2d-line)] px-5 py-3">
          <h3 className="font-display text-title font-medium text-[var(--d2d-ink)]">Add Equipment</h3>
          <button onClick={onClose} className="text-[var(--d2d-ink-soft)] hover:text-[var(--d2d-ink)]">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="d2d-scroll max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Type</span>
            <select
              className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
              value={type}
              onChange={(e) => setType(e.target.value as Equipment["type"])}
            >
              <option value="TRACTOR">Tractor</option>
              <option value="TRAILER">Trailer</option>
              <option value="CONTAINER">Container</option>
              <option value="CHASSIS">Chassis</option>
            </select>
          </label>
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Unit number</span>
            <input
              className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="UNIT-001"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">Make</span>
              <input
                className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                value={make}
                onChange={(e) => setMake(e.target.value)}
                placeholder="Freightliner"
              />
            </label>
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">Model</span>
              <input
                className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Cascadia"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">Year</span>
            <input
              type="number"
              className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-label text-[var(--d2d-ink-soft)]">VIN</span>
            <input
              className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="1HGCM82633A..."
            />
          </label>

          <div className="border-t border-[var(--d2d-line)] pt-4">
            <p className="mb-3 text-label font-medium text-[var(--d2d-ink-faint)]">Registration & Compliance</p>
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">License Plates (up to 3)</span>
              {plates.map((plate, idx) => (
                <div key={idx} className="mt-1 grid gap-2 sm:grid-cols-3">
                  <input
                    className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                    placeholder="State"
                    value={plate.state}
                    onChange={(e) => {
                      const newPlates = [...plates];
                      newPlates[idx].state = e.target.value;
                      setPlates(newPlates);
                    }}
                  />
                  <input
                    className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                    placeholder="Number"
                    value={plate.number}
                    onChange={(e) => {
                      const newPlates = [...plates];
                      newPlates[idx].number = e.target.value;
                      setPlates(newPlates);
                    }}
                  />
                  <input
                    type="date"
                    className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                    value={plate.expiry}
                    onChange={(e) => {
                      const newPlates = [...plates];
                      newPlates[idx].expiry = e.target.value;
                      setPlates(newPlates);
                    }}
                  />
                </div>
              ))}
              {plates.length < 3 && (
                <button
                  type="button"
                  className="mt-2 text-[12px] text-[var(--d2d-primary)] hover:underline"
                  onClick={() => setPlates([...plates, { state: "", number: "", expiry: "" }])}
                >
                  + Add plate
                </button>
              )}
            </label>
            <label className="block mt-4">
              <span className="text-label text-[var(--d2d-ink-soft)]">DOT Number</span>
              <input
                className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                value={dotNumber}
                onChange={(e) => setDotNumber(e.target.value)}
                placeholder="1234567"
              />
            </label>
            <label className="block mt-4">
              <span className="text-label text-[var(--d2d-ink-soft)]">MC Numbers (up to 10)</span>
              {mcNumbers.map((mc, idx) => (
                <div key={idx} className="mt-1 flex gap-2">
                  <input
                    className="flex-1 rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                    placeholder="MC-123456"
                    value={mc}
                    onChange={(e) => {
                      const newMc = [...mcNumbers];
                      newMc[idx] = e.target.value;
                      setMcNumbers(newMc);
                    }}
                  />
                  {mcNumbers.length > 1 && (
                    <button
                      type="button"
                      className="text-[var(--d2d-danger)]"
                      onClick={() => setMcNumbers(mcNumbers.filter((_, i) => i !== idx))}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {mcNumbers.length < 10 && (
                <button
                  type="button"
                  className="mt-2 text-[12px] text-[var(--d2d-primary)] hover:underline"
                  onClick={() => setMcNumbers([...mcNumbers, ""])}
                >
                  + Add MC number
                </button>
              )}
            </label>
            <label className="block mt-4">
              <span className="text-label text-[var(--d2d-ink-soft)]">IFTA</span>
              <input
                className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                value={ifta}
                onChange={(e) => setIfta(e.target.value)}
                placeholder="IFTA-12345"
              />
            </label>
            <label className="block mt-4">
              <span className="text-label text-[var(--d2d-ink-soft)]">Permits</span>
              {permits.map((permit, idx) => (
                <div key={idx} className="mt-1 flex gap-2">
                  <input
                    className="flex-1 rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                    placeholder="Permit name/number"
                    value={permit}
                    onChange={(e) => {
                      const newPermits = [...permits];
                      newPermits[idx] = e.target.value;
                      setPermits(newPermits);
                    }}
                  />
                  {permits.length > 1 && (
                    <button
                      type="button"
                      className="text-[var(--d2d-danger)]"
                      onClick={() => setPermits(permits.filter((_, i) => i !== idx))}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="mt-2 text-[12px] text-[var(--d2d-primary)] hover:underline"
                onClick={() => setPermits([...permits, ""])}
              >
                + Add permit
              </button>
            </label>
          </div>

          <div className="border-t border-[var(--d2d-line)] pt-4">
            <p className="mb-3 text-label font-medium text-[var(--d2d-ink-faint)]">Accounts & Insurance</p>
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">PrePass</span>
              <input
                className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                value={prePass}
                onChange={(e) => setPrePass(e.target.value)}
                placeholder="PrePass ID"
              />
            </label>
            <label className="block mt-4">
              <span className="text-label text-[var(--d2d-ink-soft)]">Toll Accounts</span>
              {tollAccounts.map((account, idx) => (
                <div key={idx} className="mt-1 flex gap-2">
                  <input
                    className="flex-1 rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                    placeholder="Toll account ID"
                    value={account}
                    onChange={(e) => {
                      const newAccounts = [...tollAccounts];
                      newAccounts[idx] = e.target.value;
                      setTollAccounts(newAccounts);
                    }}
                  />
                  {tollAccounts.length > 1 && (
                    <button
                      type="button"
                      className="text-[var(--d2d-danger)]"
                      onClick={() => setTollAccounts(tollAccounts.filter((_, i) => i !== idx))}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="mt-2 text-[12px] text-[var(--d2d-primary)] hover:underline"
                onClick={() => setTollAccounts([...tollAccounts, ""])}
              >
                + Add toll account
              </button>
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-label text-[var(--d2d-ink-soft)]">Insurance Carrier</span>
                <input
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                  value={insuranceCarrier}
                  onChange={(e) => setInsuranceCarrier(e.target.value)}
                  placeholder="Carrier name"
                />
              </label>
              <label className="block">
                <span className="text-label text-[var(--d2d-ink-soft)]">Policy Number</span>
                <input
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                  value={insurancePolicy}
                  onChange={(e) => setInsurancePolicy(e.target.value)}
                  placeholder="POL-12345"
                />
              </label>
              <label className="block">
                <span className="text-label text-[var(--d2d-ink-soft)]">Expiry</span>
                <input
                  type="date"
                  className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="border-t border-[var(--d2d-line)] pt-4">
            <p className="mb-3 text-label font-medium text-[var(--d2d-ink-faint)]">Other Records</p>
            <label className="block">
              <span className="text-label text-[var(--d2d-ink-soft)]">Equipment Photos (up to 8, required) *</span>
              <input
                type="file"
                accept="image/*"
                multiple
                max="8"
                className="mt-1 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] px-3 py-2 text-body-sm text-[var(--d2d-ink)] outline-none focus:border-[var(--d2d-primary)]"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 8);
                  const urls = files.map((file) => URL.createObjectURL(file));
                  setPhotos(urls);
                }}
              />
              {photos.length > 0 && (
                <p className="mt-1 text-[11px] text-[var(--d2d-ink-soft)]">{photos.length} / 8 photo(s) selected</p>
              )}
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--d2d-line)] px-5 py-3">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={!type || !unitNumber || photos.length === 0 || submitting}>
            {submitting ? "Adding..." : "Add equipment"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EquipmentDetail({ equipment: e, onClose }: { equipment: Equipment; onClose: () => void }) {
  const statusConfig: Record<Exclude<Equipment["status"], undefined>, { label: string; color: string }> = {
    AVAILABLE: { label: "Available", color: "text-[var(--d2d-success)]" },
    ON_LOAD: { label: "On Load", color: "text-[var(--d2d-primary)]" },
    IN_MAINTENANCE: { label: "In Maintenance", color: "text-[var(--d2d-warning)]" },
    INACTIVE: { label: "Inactive", color: "text-[var(--d2d-ink-faint)]" },
  };

  const status = e.status || "AVAILABLE";
  const statusInfo = statusConfig[status] || statusConfig.AVAILABLE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="d2d-scroll max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-[var(--radius)] bg-white shadow-[var(--d2d-shadow)]">
        <div className="flex items-center justify-between border-b border-[var(--d2d-line)] px-5 py-3">
          <div>
            <h2 className="font-display text-title">{e.unitNumber}</h2>
            <p className="text-body-sm text-[var(--d2d-ink-soft)]">{e.year} {e.make} {e.model} · {e.type}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("text-label font-medium", statusInfo.color)}>
              {statusInfo.label}
            </span>
            <button onClick={onClose} className="text-[var(--d2d-ink-faint)] hover:text-[var(--d2d-ink)]">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="space-y-6 p-5">
          {/* Basic Information */}
          <section>
            <p className="mb-3 flex items-center gap-1.5 text-label text-[var(--d2d-ink-faint)]">
              <Truck className="h-3.5 w-3.5" /> Basic Information
            </p>
            <div className="grid gap-3 sm:grid-cols-2 text-body-sm">
              <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                <span className="text-[12px] text-[var(--d2d-ink-faint)]">Unit Number</span>
                <p className="font-mono font-medium">{e.unitNumber}</p>
              </div>
              <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                <span className="text-[12px] text-[var(--d2d-ink-faint)]">Type</span>
                <p className="font-medium">{e.type}</p>
              </div>
              <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                <span className="text-[12px] text-[var(--d2d-ink-faint)]">Make</span>
                <p className="font-medium">{e.make}</p>
              </div>
              <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                <span className="text-[12px] text-[var(--d2d-ink-faint)]">Model</span>
                <p className="font-medium">{e.model}</p>
              </div>
              <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                <span className="text-[12px] text-[var(--d2d-ink-faint)]">Year</span>
                <p className="font-medium">{e.year}</p>
              </div>
              <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                <span className="text-[12px] text-[var(--d2d-ink-faint)]">VIN</span>
                <p className="font-mono text-[12px]">{e.vin}</p>
              </div>
            </div>
          </section>

          {/* Registration & Compliance */}
          <section>
            <p className="mb-3 flex items-center gap-1.5 text-label text-[var(--d2d-ink-faint)]">
              <ShieldCheck className="h-3.5 w-3.5" /> Registration & Compliance
            </p>
            <div className="space-y-3">
              {/* License Plates */}
              <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                <span className="text-[12px] text-[var(--d2d-ink-faint)]">License Plates</span>
                <div className="mt-2 space-y-2">
                  {e.plates.map((plate, idx) => (
                    <div key={idx} className="flex items-center justify-between text-body-sm">
                      <span className="font-mono">{plate.state} {plate.number}</span>
                      <ExpiryDot iso={plate.expiry} label="Exp" />
                    </div>
                  ))}
                </div>
              </div>

              {/* DOT & MC Numbers */}
              <div className="grid gap-3 sm:grid-cols-2">
                {e.dotNumber && (
                  <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                    <span className="text-[12px] text-[var(--d2d-ink-faint)]">DOT Number</span>
                    <p className="font-mono font-medium">{e.dotNumber}</p>
                  </div>
                )}
                {e.mcNumbers && e.mcNumbers.length > 0 && (
                  <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                    <span className="text-[12px] text-[var(--d2d-ink-faint)]">MC Numbers</span>
                    <div className="mt-1 space-y-1">
                      {e.mcNumbers.map((mc, idx) => (
                        <p key={idx} className="font-mono text-[12px]">{mc}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* IFTA & Permits */}
              <div className="grid gap-3 sm:grid-cols-2">
                {e.ifta && (
                  <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                    <span className="text-[12px] text-[var(--d2d-ink-faint)]">IFTA</span>
                    <p className="font-mono font-medium">{e.ifta}</p>
                  </div>
                )}
                {e.permits && e.permits.length > 0 && (
                  <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                    <span className="text-[12px] text-[var(--d2d-ink-faint)]">Permits</span>
                    <div className="mt-1 space-y-1">
                      {e.permits.map((permit, idx) => (
                        <p key={idx} className="text-[12px]">{permit}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Accounts & Insurance */}
          <section>
            <p className="mb-3 flex items-center gap-1.5 text-label text-[var(--d2d-ink-faint)]">
              <CreditCard className="h-3.5 w-3.5" /> Accounts & Insurance
            </p>
            <div className="space-y-3">
              {e.prePass && (
                <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                  <span className="text-[12px] text-[var(--d2d-ink-faint)]">PrePass</span>
                  <p className="font-mono font-medium">{e.prePass}</p>
                </div>
              )}
              {e.tollAccounts && e.tollAccounts.length > 0 && (
                <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                  <span className="text-[12px] text-[var(--d2d-ink-faint)]">Toll Accounts</span>
                  <div className="mt-1 space-y-1">
                    {e.tollAccounts.map((account, idx) => (
                      <p key={idx} className="font-mono text-[12px]">{account}</p>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                <span className="text-[12px] text-[var(--d2d-ink-faint)]">Insurance</span>
                <div className="mt-2 space-y-1 text-body-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--d2d-ink-soft)]">Carrier</span>
                    <span className="font-medium">{e.insurance.carrier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--d2d-ink-soft)]">Policy</span>
                    <span className="font-mono text-[12px]">{e.insurance.policy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--d2d-ink-soft)]">Expiry</span>
                    <ExpiryDot iso={e.insurance.expiry} label="Exp" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Inspections */}
          <section>
            <p className="mb-3 flex items-center gap-1.5 text-label text-[var(--d2d-ink-faint)]">
              <ClipboardCheck className="h-3.5 w-3.5" /> Inspections
            </p>
            <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
              {e.inspections.length === 0 ? (
                <p className="text-body-sm text-[var(--d2d-ink-soft)]">No inspections recorded</p>
              ) : (
                <ul className="space-y-2 text-body-sm">
                  {e.inspections.map((i, idx) => (
                    <li key={idx} className="flex items-center justify-between border-b border-[var(--d2d-line)] last:border-0 pb-2 last:pb-0">
                      <div>
                        <span className={cn(
                          "font-medium",
                          i.result === "FAIL" ? "text-[var(--d2d-danger)]" : "text-[var(--d2d-success)]"
                        )}>
                          {i.result === "FAIL" ? "Failed" : "Passed"}
                        </span>
                        {i.notes && <span className="ml-2 text-[12px] text-[var(--d2d-ink-faint)]">— {i.notes}</span>}
                      </div>
                      <span className="font-mono text-[12px] text-[var(--d2d-ink-soft)]">{fmtDate(i.date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Maintenance */}
          <section>
            <p className="mb-3 flex items-center gap-1.5 text-label text-[var(--d2d-ink-faint)]">
              <Wrench className="h-3.5 w-3.5" /> Maintenance History
            </p>
            <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
              {e.maintenance.length === 0 ? (
                <p className="text-body-sm text-[var(--d2d-ink-soft)]">No maintenance records</p>
              ) : (
                <ul className="space-y-2 text-body-sm">
                  {e.maintenance.map((m, idx) => (
                    <li key={idx} className="flex items-center justify-between border-b border-[var(--d2d-line)] last:border-0 pb-2 last:pb-0">
                      <div>
                        <span className="font-medium">{m.type}</span>
                        <span className="ml-2 text-[12px] text-[var(--d2d-ink-faint)]">@ {m.odometer.toLocaleString()} mi</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-[12px] text-[var(--d2d-ink-soft)]">{fmtDate(m.date)}</span>
                        <span className="ml-2 font-mono text-[12px]">{fmtCurrency(m.cost)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Photos */}
          <section>
            <p className="mb-3 flex items-center gap-1.5 text-label text-[var(--d2d-ink-faint)]">
              <ImageIcon className="h-3.5 w-3.5" /> Photos
            </p>
            <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
              {e.photos && e.photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {e.photos.map((_photo, idx) => (
                    <div key={idx} className="aspect-square rounded bg-[var(--d2d-line)] flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-[var(--d2d-ink-faint)]" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-body-sm text-[var(--d2d-ink-soft)]">No photos uploaded</p>
              )}
            </div>
          </section>

          {/* Current Assignment */}
          {(e.currentDriverId || e.currentLoadId) && (
            <section>
              <p className="mb-3 flex items-center gap-1.5 text-label text-[var(--d2d-ink-faint)]">
                <Package className="h-3.5 w-3.5" /> Current Assignment
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {e.currentDriverId && (
                  <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                    <span className="text-[12px] text-[var(--d2d-ink-faint)]">Current Driver</span>
                    <p className="font-mono text-[12px] mt-1">{e.currentDriverId}</p>
                  </div>
                )}
                {e.currentLoadId && (
                  <div className="rounded-[var(--radius)] border border-[var(--d2d-line)] bg-[var(--d2d-surface-sunk)] p-3">
                    <span className="text-[12px] text-[var(--d2d-ink-faint)]">Current Load</span>
                    <p className="font-mono text-[12px] mt-1">{e.currentLoadId}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
