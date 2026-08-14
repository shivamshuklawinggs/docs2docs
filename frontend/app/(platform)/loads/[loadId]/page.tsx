"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MapPin,
  Star,
  Navigation,
  History,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { useSession } from "@/lib/store/session";
import { api } from "@/lib/mock/api";
import { useAsync } from "@/lib/hooks";
import { useDataVersion } from "@/lib/store/data";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusPill } from "@/components/loads/StatusPill";
import { LoadRail } from "@/components/loads/LoadRail";
import { SimulateMenu } from "@/components/loads/SimulateMenu";
import { AssignDriverDialog } from "@/components/loads/AssignDriverDialog";
import { AssignCarrierDialog } from "@/components/loads/AssignCarrierDialog";
import { ErrorState, Skeleton } from "@/components/data/states";
import { visibleFields } from "@/lib/rbac";
import {
  fmtWeight,
  fmtDistance,
  fmtWindow,
  fmtCurrency,
  fmtDateTime,
  fmtCoords,
  fmtRelative,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LoadEventType } from "@/types";

const EQUIP_LABEL: Record<string, string> = {
  DRY_VAN_53: "Dry van 53'",
  REEFER: "Reefer",
  FLATBED: "Flatbed",
  STEP_DECK: "Step deck",
  CHASSIS: "Container-chassis",
};

const TABS = ["overview", "tracking", "activity"] as const;
type Tab = (typeof TABS)[number];

const EVENT_ICON: Record<LoadEventType, typeof MapPin> = {
  STATUS_CHANGE: Navigation,
  DOC: FileText,
  MESSAGE: Phone,
  GEOFENCE: MapPin,
  ASSIGNMENT: Star,
  EXCEPTION: AlertTriangle,
};

export default function LoadDetailPage({ params }: { params: Promise<{ loadId: string }> }) {
  const { loadId } = use(params);
  const { scope, role } = useSession();
  const version = useDataVersion((s) => s.version);
  const [tab, setTab] = useState<Tab>("overview");
  const [assignOpen, setAssignOpen] = useState(false);
  const { data: load, loading, error, retry } = useAsync(
    () => api.getLoad(loadId, scope!),
    [loadId, scope?.branchId, scope?.role, version]
  );
  const { data: drivers } = useAsync(() => api.getDrivers(scope!), [scope?.branchId, version]);
  const { data: equipment } = useAsync(() => api.getEquipment(scope!), [scope?.branchId, version]);
  const { data: companies } = useAsync(() => api.getCompanies("CARRIER"), [version]);

  const isCarrier = role === "CARRIER_CORP" || role === "CARRIER_BRANCH";
  const isBroker = role === "BROKER_CORP" || role === "BROKER_BRANCH";

  if (!scope || !role) return null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }
  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!load) {
    return (
      <ErrorState
        message="No access to this load, or it doesn't exist in the current branch scope."
        onRetry={retry}
      />
    );
  }

  const exc = load.exceptions?.find((e) => !e.resolvedAt);
  const driver = drivers?.find((d) => d.id === load.driverId);
  const tractor = equipment?.find((e) => e.id === load.tractorId);
  const trailer = equipment?.find((e) => e.id === load.trailerId);
  const vis = visibleFields(role);
  const margin = (load.rates?.customerRateUsd ?? 0) - (load.rates?.carrierRateUsd ?? 0);

  return (
    <div>
      <Link
        href="/loads"
        className="mb-3 inline-flex items-center gap-1.5 text-body-sm text-[var(--d2d-ink-soft)] hover:text-[var(--d2d-ink)]"
      >
        <ArrowLeft className="h-4 w-4" /> Load board
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-display-md text-[var(--d2d-ink)]">{load.id}</h1>
        <StatusPill status={load.status} exception={!!exc} />
        <div className="ml-auto flex gap-2">
          <Button variant="outline">Message driver</Button>
          <SimulateMenu loadId={load.id} status={load.status} />
        </div>
      </div>
      <p className="mt-1 font-mono text-[13px] text-[var(--d2d-ink-soft)]">
        {load.pickup?.city || "Unknown"}, {load.pickup?.state || ""} → {load.delivery?.city || "Unknown"}, {load.delivery?.state || ""} ·{" "}
        {fmtDistance(load.milesTotal || 0)} · {EQUIP_LABEL[load.equipmentType || "DRY_VAN_53"]} ·{" "}
        {fmtWeight(load.freight?.weightLb || 0)}
      </p>

      {/* Exception banner */}
      {exc && (
        <div className="mt-4 flex items-center gap-3 rounded-[var(--radius)] border border-[var(--d2d-danger)] bg-[var(--d2d-danger-tint)] px-4 py-3">
          <span className="text-body-sm font-medium text-[var(--d2d-danger)]">
            {exc.type.replace("_", " ")}
          </span>
          <span className="text-body-sm text-[var(--d2d-ink)]">{exc.description}</span>
          <Button variant="outline" size="sm" className="ml-auto">
            Resolve exception
          </Button>
        </div>
      )}

      {/* Full Load Rail */}
      <Card className="mt-4 p-6">
        <LoadRail status={load.status} exception={!!exc} variant="full" />
      </Card>

      {/* Tabs */}
      <div className="mt-4 flex gap-1 border-b border-[var(--d2d-line)]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-body-sm capitalize",
              tab === t
                ? "border-[var(--d2d-primary)] font-medium text-[var(--d2d-ink)]"
                : "border-transparent text-[var(--d2d-ink-soft)] hover:text-[var(--d2d-ink)]"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tracking tab */}
      {tab === "tracking" && (
        <div className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Live position
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-[var(--radius)] bg-[var(--d2d-surface-sunk)]">
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "linear-gradient(var(--d2d-line) 1px, transparent 1px), linear-gradient(90deg, var(--d2d-line) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                  }}
                />
                <div className="z-10 text-center">
                  <Navigation className="mx-auto h-6 w-6 text-[var(--d2d-primary)]" />
                  <p className="mt-2 font-mono text-[12px] text-[var(--d2d-ink-soft)]">
                    {load.currentPosition
                      ? `${fmtCoords(load.currentPosition.lat, load.currentPosition.lng)} · ${load.currentPosition.speedMph || 0} mph`
                      : "No live position — load not yet in transit"}
                  </p>
                  <p className="font-mono text-[12px] text-[var(--d2d-ink-faint)]">
                    {load.milesRemaining != null ? `${load.milesRemaining} mi remaining` : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Stop timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-body-sm">
              <div className="flex justify-between">
                <span className="text-[var(--d2d-ink-soft)]">Pickup arrival</span>
                <span className="font-mono text-[12px]">
                  {load.pickup?.actualArrival ? fmtDateTime(load.pickup.actualArrival) : "planned " + fmtDateTime(load.pickup?.windowStart || "")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--d2d-ink-soft)]">Departed pickup</span>
                <span className="font-mono text-[12px]">
                  {load.pickup?.actualDeparture ? fmtDateTime(load.pickup.actualDeparture) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--d2d-ink-soft)]">Delivery arrival</span>
                <span className="font-mono text-[12px]">
                  {load.delivery?.actualArrival ? fmtDateTime(load.delivery.actualArrival) : "planned " + fmtDateTime(load.delivery?.windowStart || "")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity tab */}
      {tab === "activity" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {load.events?.map((ev) => {
                const Icon = EVENT_ICON[ev.type] ?? Navigation;
                return (
                  <li key={ev.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--d2d-surface-sunk)]">
                      <Icon className="h-3.5 w-3.5 text-[var(--d2d-ink-soft)]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm text-[var(--d2d-ink)]">{ev.description}</p>
                      <p className="font-mono text-[11px] text-[var(--d2d-ink-faint)]">
                        {ev.actor} · {fmtRelative(ev.at)}
                      </p>
                    </div>
                  </li>
                );
              }) || []}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Overview tab */}
      {tab === "overview" && (
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Route */}
        <Card>
          <CardHeader>
            <CardTitle>Route</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-label text-[var(--d2d-ink-faint)]">Pickup</p>
              <p className="font-medium text-[var(--d2d-ink)]">{load.pickup?.facilityName || "Unknown"}</p>
              <p className="text-body-sm text-[var(--d2d-ink-soft)]">
                {load.pickup?.address || ""}, {load.pickup?.city || ""} {load.pickup?.state || ""}
              </p>
              <p className="mt-1 font-mono text-[12px] text-[var(--d2d-ink-soft)]">
                {fmtWindow(load.pickup?.windowStart || "", load.pickup?.windowEnd || "")}
              </p>
              {load.pickup?.dockDoor && (
                <p className="text-[12px] text-[var(--d2d-ink-soft)]">
                  {load.pickup.dockDoor} · Contact {load.pickup.contactName || "Unknown"}
                </p>
              )}
            </div>
            <div className="border-t border-[var(--d2d-line)] pt-4">
              <p className="text-label text-[var(--d2d-ink-faint)]">Delivery</p>
              <p className="font-medium text-[var(--d2d-ink)]">{load.delivery?.facilityName || "Unknown"}</p>
              <p className="text-body-sm text-[var(--d2d-ink-soft)]">
                {load.delivery?.address || ""}, {load.delivery?.city || ""} {load.delivery?.state || ""}
              </p>
              <p className="mt-1 font-mono text-[12px] text-[var(--d2d-ink-soft)]">
                {fmtWindow(load.delivery?.windowStart || "", load.delivery?.windowEnd || "")}
              </p>
              {load.etaDelivery && (
                <p className="mt-1 flex items-center gap-1.5 text-[12px]">
                  <span className="font-mono text-[var(--d2d-ink-soft)]">
                    ETA {fmtDateTime(load.etaDelivery)}
                  </span>
                  <span className={load.onTime ? "text-[var(--d2d-success)]" : "text-[var(--d2d-danger)]"}>
                    ● {load.onTime ? "On time" : "Delayed"}
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>{isCarrier ? "Driver Assignment" : "Carrier Assignment"}</CardTitle>
          </CardHeader>
          <CardContent>
            {isCarrier ? (
              // Carrier view: Show driver assignment
              driver ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--d2d-primary)] text-body-sm font-medium text-white">
                      {driver.name.split(" ").map((p) => p[0]).join("")}
                    </span>
                    <div>
                      <p className="font-medium text-[var(--d2d-ink)]">{driver.name}</p>
                      <p className="text-[12px] text-[var(--d2d-ink-soft)]">
                        CDL-{driver.driver?.licenses?.[0]?.class} · {driver.driver?.endorsements?.join(" · ")}
                      </p>
                      <p className="flex items-center gap-1 text-[12px] text-[var(--d2d-ink-soft)]">
                        <Star className="h-3 w-3 fill-[var(--d2d-signal)] text-[var(--d2d-signal)]" />
                        {driver.driver?.rating} ({driver.driver?.loadsCompleted} loads)
                      </p>
                    </div>
                  </div>
                  <p className="flex items-center gap-1.5 font-mono text-[12px] text-[var(--d2d-ink-soft)]">
                    <Phone className="h-3.5 w-3.5" /> {driver.driver?.phones?.[0]}
                  </p>
                  {tractor && (
                    <p className="font-mono text-[12px] text-[var(--d2d-ink-soft)]">
                      Tractor {tractor.unitNumber} · {tractor.year} {tractor.make}
                    </p>
                  )}
                  {trailer && (
                    <p className="font-mono text-[12px] text-[var(--d2d-ink-soft)]">
                      Trailer {trailer.unitNumber} · {trailer.model}
                    </p>
                  )}
                  <Button variant="outline" size="sm" className="mt-1" onClick={() => setAssignOpen(true)}>
                    Reassign driver
                  </Button>
                </div>
              ) : (
                <div className="py-4">
                  <p className="text-body-sm text-[var(--d2d-ink-soft)]">No driver assigned yet.</p>
                  <Button size="sm" className="mt-2" onClick={() => setAssignOpen(true)}>
                    Assign driver
                  </Button>
                </div>
              )
            ) : isBroker ? (
              // Broker view: Show carrier assignment
              load.carrier ? (
                <div className="space-y-2">
                  {(() => {
                    const carrier = companies?.find((c) => c.id === load.carrier?.carrierId);
                    return carrier ? (
                      <>
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--d2d-primary)] text-body-sm font-medium text-white">
                            {carrier.name.split(" ").map((p) => p[0]).join("")}
                          </span>
                          <div>
                            <p className="font-medium text-[var(--d2d-ink)]">{carrier.name}</p>
                            <p className="text-[12px] text-[var(--d2d-ink-soft)]">
                              {carrier.dotNumber ? `DOT: ${carrier.dotNumber}` : ""}
                              {carrier.mcNumbers?.length ? ` · MC: ${carrier.mcNumbers.join(", ")}` : ""}
                            </p>
                            <p className="flex items-center gap-1 text-[12px] text-[var(--d2d-ink-soft)]">
                              <Star className="h-3 w-3 fill-[var(--d2d-signal)] text-[var(--d2d-signal)]" />
                              {carrier.rating} · {carrier.plan}
                            </p>
                          </div>
                        </div>
                        <Button size="sm" className="mt-2" onClick={() => setAssignOpen(true)}>
                          Reassign carrier
                        </Button>
                      </>
                    ) : (
                      <p className="text-body-sm text-[var(--d2d-ink-soft)]">Carrier information not available.</p>
                    );
                  })()}
                </div>
              ) : (
                <div className="py-4">
                  <p className="text-body-sm text-[var(--d2d-ink-soft)]">No carrier assigned yet.</p>
                  <Button size="sm" className="mt-2" onClick={() => setAssignOpen(true)}>
                    Assign carrier
                  </Button>
                </div>
              )
            ) : (
              // Other roles: Show generic assignment info
              <div className="py-4">
                <p className="text-body-sm text-[var(--d2d-ink-soft)]">
                  {load.carrier ? "Carrier assigned" : "No carrier assigned"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Freight */}
        <Card>
          <CardHeader>
            <CardTitle>Freight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-body-sm">
            <p className="text-[var(--d2d-ink)]">
              {load.freight?.commodity || "Unknown"} · {load.freight?.palletCount || 0} pallets
            </p>
            <p className="font-mono text-[12px] text-[var(--d2d-ink-soft)]">
              {fmtWeight(load.freight?.weightLb || 0)} ·{" "}
              {load.freight?.hazmat ? `Hazmat ${load.freight.unNumber} (class ${load.freight.hazmatClass})` : "Non-hazmat"}
            </p>
            <p className="font-mono text-[12px] text-[var(--d2d-ink-soft)]">
              {load.references?.po ? `Ref ${load.references.po}` : "No ref"} {load.references?.bol ? `· BOL ${load.references.bol}` : ""}
            </p>
            <p className="font-mono text-[12px] text-[var(--d2d-ink-soft)]">
              Declared value {fmtCurrency(load.freight?.declaredValueUsd || 0)}
            </p>
            {load.freight?.specialHandling && load.freight.specialHandling.length > 0 && (
              <p className="text-[12px] text-[var(--d2d-ink-soft)]">
                Special handling: {load.freight.specialHandling.join(", ")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Rate / margin — gated per role (spec §7.2, §8.10) */}
        <Card>
          <CardHeader>
            <CardTitle>Rate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-body-sm">
            {vis.customerRate && (
              <div className="flex justify-between">
                <span className="text-[var(--d2d-ink-soft)]">Customer rate</span>
                <span className="font-mono font-medium">{fmtCurrency(load.rates?.customerRateUsd || 0)}</span>
              </div>
            )}
            {vis.carrierRate && load.rates?.carrierRateUsd != null && (
              <div className="flex justify-between">
                <span className="text-[var(--d2d-ink-soft)]">Carrier rate</span>
                <span className="font-mono font-medium">{fmtCurrency(load.rates?.carrierRateUsd || 0)}</span>
              </div>
            )}
            {vis.margin && (
              <div className="mt-1 flex justify-between border-t border-[var(--d2d-line)] pt-2">
                <span className="font-medium text-[var(--d2d-primary)]">Margin</span>
                <span className="font-mono font-medium text-[var(--d2d-primary)]">
                  {fmtCurrency(margin)} ·{" "}
                  {load.rates?.customerRateUsd
                    ? ((margin / load.rates.customerRateUsd) * 100).toFixed(1)
                    : "0"}
                  %
                </span>
              </div>
            )}
            {!vis.customerRate && !vis.carrierRate && (
              <p className="text-[12px] text-[var(--d2d-ink-faint)]">
                Rate details are not shared with your role.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {assignOpen && isCarrier && drivers && (
        <AssignDriverDialog load={load} drivers={drivers} onClose={() => setAssignOpen(false)} />
      )}
      {assignOpen && isBroker && companies && (
        <AssignCarrierDialog load={load} companies={companies} onClose={() => setAssignOpen(false)} />
      )}
    </div>
  );
}
