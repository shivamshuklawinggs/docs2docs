"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useDataVersion } from "@/lib/store/data";
import { PageHeader } from "@/components/shell/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CITIES, FACILITY_NAMES, COMMODITIES } from "@/lib/mock/reference";
import { useAsync } from "@/lib/hooks";
import { fmtCurrency, fmtDistance } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EquipmentType, Stop } from "@/types";

const STEPS = ["Pickup & Delivery", "Freight", "Requirements", "Review"];
const EQUIP: { value: EquipmentType; label: string }[] = [
  { value: "DRY_VAN_53", label: "Dry van 53'" },
  { value: "REEFER", label: "Reefer" },
  { value: "FLATBED", label: "Flatbed" },
  { value: "STEP_DECK", label: "Step deck" },
  { value: "CHASSIS", label: "Container-chassis" },
];
const HANDLING = ["Liftgate", "Inside delivery", "Appointment required"];

interface FormState {
  pickupCity: string;
  pickupAddress: string;
  pickupFacility: string;
  deliveryCity: string;
  deliveryAddress: string;
  deliveryFacility: string;
  commodity: string;
  weightLb: number;
  palletCount: number;
  hazmat: boolean;
  unNumber: string;
  hazmatClass: string;
  packingGroup: string;
  emergencyContact: string;
  declaredValueUsd: number;
  equipmentType: EquipmentType;
  handling: string[];
  po: string;
  customerRateUsd: number;
}

const INITIAL: FormState = {
  pickupCity: "Dallas",
  pickupAddress: "",
  pickupFacility: FACILITY_NAMES[0],
  deliveryCity: "Houston",
  deliveryAddress: "",
  deliveryFacility: FACILITY_NAMES[1],
  commodity: COMMODITIES[0],
  weightLb: 24000,
  palletCount: 20,
  hazmat: false,
  unNumber: "",
  hazmatClass: "",
  packingGroup: "",
  emergencyContact: "",
  declaredValueUsd: 45000,
  equipmentType: "DRY_VAN_53",
  handling: [],
  po: "",
  customerRateUsd: 2400,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-label text-[var(--d2d-ink-soft)]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  "h-9 w-full rounded-[var(--radius)] border border-[var(--d2d-line)] px-3 text-body-sm outline-none focus:border-[var(--d2d-primary)]";

function estimateMiles(a: string, b: string) {
  // Try to find cities by name, otherwise use defaults
  const cityKeyA = Object.keys(CITIES).find(key => 
    CITIES[key].city.toLowerCase() === a.toLowerCase()
  );
  const cityKeyB = Object.keys(CITIES).find(key => 
    CITIES[key].city.toLowerCase() === b.toLowerCase()
  );
  const ca = cityKeyA ? CITIES[cityKeyA] : { lat: 32.7767, lng: -96.7970 };
  const cb = cityKeyB ? CITIES[cityKeyB] : { lat: 29.7604, lng: -95.3698 };
  const dLat = ca.lat - cb.lat;
  const dLng = ca.lng - cb.lng;
  return Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 69);
}

export default function CreateOrderPage() {
  const router = useRouter();
  const { scope, user } = useSession();
  const bump = useDataVersion((s) => s.bump);
  const [step, setStep] = useState(0);
  const [f, setF] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);

  const { data: companies } = useAsync(() => api.getCompanies(), [bump]);
  const { data: branches } = useAsync(() => user && scope ? api.getBranches(scope) : Promise.resolve([]), [user?.companyId, scope?.branchId, bump]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  const hazmatIncomplete =
    f.hazmat && (!f.unNumber || !f.hazmatClass || !f.packingGroup || !f.emergencyContact);
  const miles = estimateMiles(f.pickupCity, f.deliveryCity);

  const makeStop = (cityName: string, address: string, facility: string): Stop => {
    // Try to find the city in our CITIES object, otherwise use defaults
    const cityKey = Object.keys(CITIES).find(key => 
      CITIES[key].city.toLowerCase() === cityName.toLowerCase()
    );
    const c = cityKey ? CITIES[cityKey] : { city: cityName, state: "TX", lat: 32.7767, lng: -96.7970 };
    return {
      facilityName: facility,
      address: address || "100 Commerce Way",
      city: c.city,
      state: c.state,
      zip: "00000",
      contactName: "Dock Supervisor",
      contactPhone: "(000) 555-0000",
      windowStart: new Date(Date.now() + 86400000).toISOString(),
      windowEnd: new Date(Date.now() + 86400000 + 2 * 3600000).toISOString(),
      lat: c.lat,
      lng: c.lng,
    };
  };

  const submit = async (dispatch: boolean) => {
    if (!scope) return;
    setSubmitting(true);
    const branchId =
      scope.branchId !== "ALL"
        ? scope.branchId
        : branches?.find((b) => b.companyId === user?.companyId)?.id ?? branches?.[0]?.id ?? "";
    const shipperId = user?.companyId ?? companies?.[0]?.id ?? "";
    const receiverId = companies?.find((c) => c.type === "SHIPPER_RECEIVER")?.id ?? companies?.[0]?.id ?? "";
    const created = await api.createLoad({
      branchId,
      shipperId,
      receiverId,
      pickup: makeStop(f.pickupCity, f.pickupAddress, f.pickupFacility),
      delivery: makeStop(f.deliveryCity, f.deliveryAddress, f.deliveryFacility),
      equipmentType: f.equipmentType,
      requiredQualifications: f.hazmat ? ["Hazmat endorsement"] : [],
      milesTotal: miles,
      onTime: true,
      rates: { customerRateUsd: f.customerRateUsd },
      references: { po: f.po || undefined },
      freight: {
        commodity: f.commodity,
        pieces: f.palletCount,
        weightLb: f.weightLb,
        palletCount: f.palletCount,
        hazmat: f.hazmat,
        unNumber: f.hazmat ? f.unNumber : undefined,
        hazmatClass: f.hazmat ? f.hazmatClass : undefined,
        packingGroup: f.hazmat ? f.packingGroup : undefined,
        emergencyContact: f.hazmat ? f.emergencyContact : undefined,
        declaredValueUsd: f.declaredValueUsd,
        specialHandling: f.handling,
      },
    });
    if (dispatch) await api.advanceLoad(created.id); // DRAFT → DISPATCHED
    bump();
    setSubmitting(false);
    router.push(`/loads/${created.id}`);
  };

  return (
    <div>
      <PageHeader title="Create order" subtitle="Five steps to a ready-to-dispatch load." />

      {/* Step indicator */}
      <div className="mb-5 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-medium",
                i < step && "bg-[var(--d2d-primary)] text-white",
                i === step && "bg-[var(--d2d-primary)] text-white",
                i > step && "border border-[var(--d2d-line-strong)] text-[var(--d2d-ink-faint)]"
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={cn("text-body-sm", i === step ? "font-medium" : "text-[var(--d2d-ink-soft)]")}>
              {s}
            </span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-[var(--d2d-line)]" />}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardContent className="pt-5">
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-label font-medium text-[var(--d2d-ink)] mb-3">Pickup Details</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="City">
                      <input className={inputCls} value={f.pickupCity} onChange={(e) => set("pickupCity", e.target.value)} placeholder="Dallas" />
                    </Field>
                    <Field label="Address">
                      <input className={inputCls} value={f.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} placeholder="123 Main Street" />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Facility">
                        <select className={inputCls} value={f.pickupFacility} onChange={(e) => set("pickupFacility", e.target.value)}>
                          {FACILITY_NAMES.map((n) => <option key={n}>{n}</option>)}
                        </select>
                      </Field>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-label font-medium text-[var(--d2d-ink)] mb-3">Delivery Details</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="City">
                      <input className={inputCls} value={f.deliveryCity} onChange={(e) => set("deliveryCity", e.target.value)} placeholder="Houston" />
                    </Field>
                    <Field label="Address">
                      <input className={inputCls} value={f.deliveryAddress} onChange={(e) => set("deliveryAddress", e.target.value)} placeholder="456 Oak Avenue" />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Facility">
                        <select className={inputCls} value={f.deliveryFacility} onChange={(e) => set("deliveryFacility", e.target.value)}>
                          {FACILITY_NAMES.map((n) => <option key={n}>{n}</option>)}
                        </select>
                      </Field>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Commodity">
                  <select className={inputCls} value={f.commodity} onChange={(e) => set("commodity", e.target.value)}>
                    {COMMODITIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Weight (lb)">
                  <input type="number" className={inputCls} value={f.weightLb} onChange={(e) => set("weightLb", Number(e.target.value))} />
                </Field>
                <Field label="Pallet count">
                  <input type="number" className={inputCls} value={f.palletCount} onChange={(e) => set("palletCount", Number(e.target.value))} />
                </Field>
                <Field label="Declared value (USD)">
                  <input type="number" className={inputCls} value={f.declaredValueUsd} onChange={(e) => set("declaredValueUsd", Number(e.target.value))} />
                </Field>
                <label className="flex items-center gap-2 text-body-sm sm:col-span-2">
                  <input type="checkbox" checked={f.hazmat} onChange={(e) => set("hazmat", e.target.checked)} className="accent-[var(--d2d-primary)]" />
                  This shipment contains hazmat
                </label>
                {f.hazmat && (
                  <>
                    <Field label="UN number">
                      <input className={inputCls} value={f.unNumber} onChange={(e) => set("unNumber", e.target.value)} placeholder="UN1993" />
                    </Field>
                    <Field label="Hazmat class">
                      <input className={inputCls} value={f.hazmatClass} onChange={(e) => set("hazmatClass", e.target.value)} placeholder="3" />
                    </Field>
                    <Field label="Packing group">
                      <input className={inputCls} value={f.packingGroup} onChange={(e) => set("packingGroup", e.target.value)} placeholder="II" />
                    </Field>
                    <Field label="Emergency contact">
                      <input className={inputCls} value={f.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} placeholder="(000) 555-0000" />
                    </Field>
                  </>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Field label="Equipment type">
                  <select
                    className={inputCls}
                    value={f.equipmentType}
                    onChange={(e) => set("equipmentType", e.target.value as EquipmentType)}
                  >
                    {EQUIP.filter((e) => !f.hazmat || e.value !== "FLATBED").map((e) => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </Field>
                {f.hazmat && (
                  <p className="text-[12px] text-[var(--d2d-signal)]">
                    Hazmat selected — flatbed removed and a hazmat-endorsed driver will be required.
                  </p>
                )}
                <div>
                  <span className="text-label text-[var(--d2d-ink-soft)]">Special handling</span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {HANDLING.map((h) => {
                      const on = f.handling.includes(h);
                      return (
                        <button
                          key={h}
                          onClick={() =>
                            set("handling", on ? f.handling.filter((x) => x !== h) : [...f.handling, h])
                          }
                          className={cn(
                            "rounded-[var(--radius)] border px-3 py-1.5 text-body-sm",
                            on
                              ? "border-[var(--d2d-primary)] bg-[var(--d2d-primary-tint)] text-[var(--d2d-primary)]"
                              : "border-[var(--d2d-line)] text-[var(--d2d-ink-soft)]"
                          )}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="PO number">
                  <input className={inputCls} value={f.po} onChange={(e) => set("po", e.target.value)} placeholder="PO-88214" />
                </Field>
                <Field label="Customer rate (USD)">
                  <input type="number" className={inputCls} value={f.customerRateUsd} onChange={(e) => set("customerRateUsd", Number(e.target.value))} />
                </Field>
                {hazmatIncomplete && (
                  <p className="flex items-center gap-2 text-body-sm text-[var(--d2d-danger)] sm:col-span-2">
                    <AlertTriangle className="h-4 w-4" /> Complete all hazmat fields in step 2 before creating this load.
                  </p>
                )}
              </div>
            )}

            {/* Nav */}
            <div className="mt-6 flex items-center justify-between border-t border-[var(--d2d-line)] pt-4">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => submit(false)} disabled={hazmatIncomplete || submitting}>
                    Save as draft
                  </Button>
                  <Button onClick={() => submit(true)} disabled={hazmatIncomplete || submitting}>
                    Create and dispatch
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary rail */}
        <Card className="self-start">
          <CardContent className="pt-5">
            <p className="text-label text-[var(--d2d-ink-faint)]">Order summary</p>
            <dl className="mt-3 space-y-2 text-body-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--d2d-ink-soft)]">Lane</dt>
                <dd className="font-mono text-[12px]">{f.pickupCity} → {f.deliveryCity}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--d2d-ink-soft)]">Est. distance</dt>
                <dd className="font-mono text-[12px]">{fmtDistance(miles)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--d2d-ink-soft)]">Equipment</dt>
                <dd className="font-mono text-[12px]">{EQUIP.find((e) => e.value === f.equipmentType)?.label}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--d2d-ink-soft)]">Weight</dt>
                <dd className="font-mono text-[12px]">{f.weightLb.toLocaleString()} lb</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--d2d-ink-soft)]">Hazmat</dt>
                <dd className="font-mono text-[12px]">{f.hazmat ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between border-t border-[var(--d2d-line)] pt-2">
                <dt className="font-medium">Customer rate</dt>
                <dd className="font-mono font-medium">{fmtCurrency(f.customerRateUsd)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
