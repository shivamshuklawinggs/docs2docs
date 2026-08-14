// Port of lib/lifecycle.ts — the 8-step lifecycle state machine.

type LoadStatus = "DRAFT" | "DISPATCHED" | "ASSIGNED" | "AT_PICKUP" | "LOADED" | "IN_TRANSIT" | "AT_DELIVERY" | "DELIVERED" | "INVOICED" | "PAID" | "CANCELLED";

const STATUS_STEP: Record<LoadStatus, number> = {
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

const STATUS_LABEL: Record<LoadStatus, string> = {
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

interface Exception {
  resolvedAt?: string;
}

interface Load {
  exceptions?: Exception[];
}

function nextStatus(status: LoadStatus): LoadStatus | null {
  if (status === "CANCELLED") return null;
  const idx = ORDER.indexOf(status);
  if (idx < 0 || idx === ORDER.length - 1) return null;
  return ORDER[idx + 1];
}

function canCancel(status: LoadStatus): boolean {
  return ["DRAFT", "DISPATCHED", "ASSIGNED"].includes(status);
}

function hasOpenException(load: Load): boolean {
  return (load.exceptions || []).some((e) => !e.resolvedAt);
}

export {
  STATUS_STEP,
  STATUS_LABEL,
  ORDER,
  nextStatus,
  canCancel,
  hasOpenException,
};
