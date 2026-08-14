// The 8-step lifecycle state machine (spec §7)
import type { Load, LoadStatus, LifecycleStep } from "@/types";

export const LIFECYCLE = [
  { step: 1, key: "DRAFT", label: "Order created", actor: "Shipper" },
  { step: 2, key: "DISPATCHED", label: "Dispatched", actor: "Broker / Carrier" },
  { step: 3, key: "ASSIGNED", label: "Driver assigned", actor: "Carrier" },
  { step: 4, key: "AT_PICKUP", label: "At pickup", actor: "Driver" },
  { step: 5, key: "LOADED", label: "Loaded — e-BOL", actor: "Shipper + Driver" },
  { step: 6, key: "IN_TRANSIT", label: "In transit", actor: "Driver" },
  { step: 7, key: "AT_DELIVERY", label: "Delivered — POD", actor: "Receiver + Driver" },
  { step: 8, key: "INVOICED", label: "Invoiced", actor: "System" },
] as const;

/** Compressed labels used inside the ticks rail. */
export const RAIL_TICKS = [
  "Order",
  "Dispatch",
  "Assign",
  "Pickup",
  "Loaded",
  "Transit",
  "Delivery",
  "Invoice",
] as const;

// Ordered status progression driving `advanceLoad`.
const ORDER: LoadStatus[] = [
  "DRAFT",
  "DISPATCHED",
  "ASSIGNED",
  "AT_PICKUP",
  "LOADED",
  "IN_TRANSIT",
  "AT_DELIVERY",
  "DELIVERED",
  "INVOICED",
  "PAID",
];

// Map a status to its 1..8 rail step.
export const STATUS_STEP: Record<LoadStatus, LifecycleStep> = {
  DRAFT: 1,
  DISPATCHED: 2,
  ASSIGNED: 3,
  AT_PICKUP: 4,
  LOADED: 5,
  IN_TRANSIT: 6,
  AT_DELIVERY: 7,
  DELIVERED: 8,
  INVOICED: 8,
  PAID: 8,
  CANCELLED: 1,
};

export const STATUS_LABEL: Record<LoadStatus, string> = {
  DRAFT: "Draft",
  DISPATCHED: "Dispatched",
  ASSIGNED: "Assigned",
  AT_PICKUP: "At pickup",
  LOADED: "Loaded",
  IN_TRANSIT: "In transit",
  AT_DELIVERY: "At delivery",
  DELIVERED: "Delivered",
  INVOICED: "Invoiced",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

// status → CSS custom property for the ramp color.
export const STATUS_COLOR_VAR: Record<LoadStatus, string> = {
  DRAFT: "--st-draft",
  DISPATCHED: "--st-dispatched",
  ASSIGNED: "--st-assigned",
  AT_PICKUP: "--st-at-pickup",
  LOADED: "--st-loaded",
  IN_TRANSIT: "--st-in-transit",
  AT_DELIVERY: "--st-at-delivery",
  DELIVERED: "--st-delivered",
  INVOICED: "--st-invoiced",
  PAID: "--st-paid",
  CANCELLED: "--d2d-danger",
};

export function nextStatus(status: LoadStatus): LoadStatus | null {
  if (status === "CANCELLED") return null;
  const idx = ORDER.indexOf(status);
  if (idx < 0 || idx === ORDER.length - 1) return null;
  return ORDER[idx + 1];
}

export function canCancel(status: LoadStatus): boolean {
  return ["DRAFT", "DISPATCHED", "ASSIGNED"].includes(status);
}

export function hasOpenException(load: Load): boolean {
  return load.exceptions.some((e) => !e.resolvedAt);
}
