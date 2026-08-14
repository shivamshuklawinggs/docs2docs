// Mutable in-memory database (mock persistence). Cloned once from SEED so the
// demo can drive a load through all 8 lifecycle steps live. Phase 2 swaps this
// for a real backend behind the same api surface.
import type {  Invoice, Load, LoadEvent, Notification, Company, Branch, User } from "@/types";
import { SEED } from "./seed";
import { STATUS_STEP, STATUS_LABEL, nextStatus } from "@/lib/lifecycle";

function clone<T>(v: T): T {
  return typeof structuredClone === "function"
    ? structuredClone(v)
    : JSON.parse(JSON.stringify(v));
}

export const DB = {
  loads: clone(SEED.loads) as Load[],
  invoices: clone(SEED.invoices) as Invoice[],
  notifications: clone(SEED.notifications) as Notification[],
  companies: clone(SEED.companies) as Company[],
  branches: clone(SEED.branches) as Branch[],
  users: clone(SEED.users) as User[],
};

let seq = 100000;
const uid = (p: string) => `${p}-${seq++}`;
const now = () => new Date().toISOString();

function pushEvent(load: Load, ev: Omit<LoadEvent, "id" | "loadId">) {
  load.events.unshift({ id: uid("evt"), loadId: load.id, ...ev });
}

function signDoc(load: Load, type: "BOL" | "POD", signer: string) {
  let doc = load.documents.find((d) => d.type === type);
  if (!doc) {
    doc = {
      id: uid("doc"),
      loadId: load.id,
      type,
      fileName: `${load.id}-${type}.pdf`,
      uploadedBy: signer,
      uploadedAt: now(),
      signed: false,
      auditTrail: [{ actor: signer, action: "Uploaded", at: now() }],
    };
    load.documents.push(doc);
  }
  doc.signed = true;
  doc.signedBy = signer;
  doc.signedAt = now();
  doc.signatureMethod = "LIVE";
  doc.gps = { lat: load.pickup.lat, lng: load.pickup.lng };
  doc.auditTrail.push({ actor: signer, action: "Signed", at: now() });
  pushEvent(load, {
    at: now(),
    actor: signer,
    actorRole: "SYSTEM",
    type: "DOC",
    description: `${type} signed by ${signer}`,
  });
}

function generateInvoice(load: Load) {
  if (load.invoiceId) return;
  const carrierRate = load.rates.carrierRateUsd ?? 0;
  const detention = load.exceptions.find((e) => e.type === "DETENTION" && !e.resolvedAt);
  const lines = [
    { description: "Linehaul", qty: 1, rate: carrierRate, amount: carrierRate },
    {
      description: "Fuel surcharge",
      qty: 1,
      rate: Math.round(carrierRate * 0.12),
      amount: Math.round(carrierRate * 0.12),
    },
  ];
  if (detention?.detentionMinutes) {
    const amt = Math.round((detention.detentionMinutes / 60) * 65);
    lines.push({ description: `Detention (${detention.detentionMinutes} min)`, qty: 1, rate: amt, amount: amt });
  }
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const inv: Invoice = {
    id: uid("inv"),
    loadId: load.id,
    number: `INV-${27000 + DB.invoices.length}`,
    status: "SENT",
    issuedAt: now(),
    dueAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    terms: "Net 30",
    billTo: SEED.companies.find((c) => c.id === load.shipperId)?.name ?? "Shipper",
    remitTo: SEED.companies.find((c) => c.id === load.carrier?.carrierId)?.name ?? "Carrier",
    lines,
    subtotal,
    total: subtotal,
    attachedDocIds: load.documents.filter((d) => d.type === "BOL" || d.type === "POD").map((d) => d.id),
    marginUsd: (load.rates.customerRateUsd ?? 0) - carrierRate,
  };
  DB.invoices.push(inv);
  load.invoiceId = inv.id;
}

export function advanceLoad(id: string): Load | null {
  const load = DB.loads.find((l) => l.id === id);
  if (!load) return null;
  const next = nextStatus(load.status);
  if (!next) return load;

  load.status = next;
  load.step = STATUS_STEP[next];

  const stamp = now();
  switch (next) {
    case "AT_PICKUP":
      load.pickup.actualArrival = stamp;
      break;
    case "LOADED":
      load.pickup.actualDeparture = stamp;
      signDoc(load, "BOL", "Shipper");
      break;
    case "IN_TRANSIT":
      load.milesRemaining = Math.round(load.milesTotal * 0.85);
      load.currentPosition = {
        lat: (load.pickup.lat + load.delivery.lat) / 2,
        lng: (load.pickup.lng + load.delivery.lng) / 2,
        updatedAt: stamp,
        speedMph: 62,
      };
      break;
    case "AT_DELIVERY":
      load.delivery.actualArrival = stamp;
      load.milesRemaining = 0;
      break;
    case "DELIVERED":
      load.delivery.actualDeparture = stamp;
      signDoc(load, "POD", "Receiver");
      break;
    case "INVOICED":
      generateInvoice(load);
      break;
  }

  pushEvent(load, {
    at: stamp,
    actor: "System",
    actorRole: "SYSTEM",
    type: "STATUS_CHANGE",
    description: `Load moved to ${STATUS_LABEL[next]}`,
  });
  return load;
}

export function triggerArrival(id: string): Load | null {
  const load = DB.loads.find((l) => l.id === id);
  if (!load) return null;
  pushEvent(load, {
    at: now(),
    actor: "System",
    actorRole: "SYSTEM",
    type: "GEOFENCE",
    description: "5-mile arrival alert fired — receiver notified, dock door panel opened",
  });
  DB.notifications.unshift({
    id: uid("ntf"),
    loadId: load.id,
    kind: "ARRIVAL_5MI",
    title: `${load.id} — 5 miles from delivery`,
    body: `${load.delivery.facilityName}, ${load.delivery.city} ${load.delivery.state}. Prepare dock door.`,
    at: now(),
    read: false,
    pinned: true,
  });
  return load;
}

export function addDelay(id: string): Load | null {
  const load = DB.loads.find((l) => l.id === id);
  if (!load) return null;
  load.exceptions.push({
    id: uid("exc"),
    loadId: load.id,
    type: "DETENTION",
    description: "Simulated 45-minute delay reported en route.",
    openedAt: now(),
    detentionMinutes: 45,
  });
  load.onTime = false;
  pushEvent(load, {
    at: now(),
    actor: "Driver",
    actorRole: "DRIVER",
    type: "EXCEPTION",
    description: "45-minute delay reported.",
  });
  return load;
}

export function resetLoad(id: string): Load | null {
  const idx = DB.loads.findIndex((l) => l.id === id);
  if (idx < 0) return null;
  // restore the pristine seed version
  const pristine = SEED.loads.find((l) => l.id === id);
  if (pristine) {
    const restored = clone(pristine);
    restored.status = "DRAFT";
    restored.step = 1;
    restored.driverId = undefined;
    restored.tractorId = undefined;
    restored.trailerId = undefined;
    restored.invoiceId = undefined;
    restored.exceptions = [];
    restored.currentPosition = undefined;
    restored.onTime = true;
    restored.pickup.actualArrival = undefined;
    restored.pickup.actualDeparture = undefined;
    restored.delivery.actualArrival = undefined;
    restored.delivery.actualDeparture = undefined;
    restored.events = [
      {
        id: uid("evt"),
        loadId: id,
        at: now(),
        actor: "System",
        actorRole: "SYSTEM",
        type: "STATUS_CHANGE",
        description: "Load reset to Draft",
      },
    ];
    DB.loads[idx] = restored;
    return restored;
  }
  return DB.loads[idx];
}

export function assignDriver(id: string, driverId: string): Load | null {
  const load = DB.loads.find((l) => l.id === id);
  if (!load) return null;
  const driver = SEED.drivers.find((d) => d.id === driverId);
  if (!driver) return load;
  load.driverId = driverId;
  load.tractorId = driver.driver?.currentTractorId ?? SEED.equipment.find((e) => e.type === "TRACTOR")?.id;
  load.trailerId = driver.driver?.currentTrailerId ?? SEED.equipment.find((e) => e.type === "TRAILER")?.id;
  if (load.status === "DRAFT" || load.status === "DISPATCHED") {
    load.status = "ASSIGNED";
    load.step = STATUS_STEP.ASSIGNED;
  }
  pushEvent(load, {
    at: now(),
    actor: "Dispatcher",
    actorRole: "CARRIER_BRANCH",
    type: "ASSIGNMENT",
    description: `${driver.name} assigned to load`,
  });
  return load;
}

export function createLoad(partial: Partial<Load>): Load {
  const num = 24820 + DB.loads.filter((l) => l.id.startsWith("D2D-248")).length;
  const base = clone(SEED.loads[0]);
  const load: Load = {
    ...base,
    ...partial,
    id: `D2D-${num}`,
    status: "DRAFT",
    step: 1,
    driverId: undefined,
    tractorId: undefined,
    trailerId: undefined,
    invoiceId: undefined,
    documents: [],
    exceptions: [],
    currentPosition: undefined,
    onTime: true,
    createdAt: now(),
    events: [
      {
        id: uid("evt"),
        loadId: `D2D-${num}`,
        at: now(),
        actor: "Shipper",
        actorRole: "SHIPPER_RECEIVER",
        type: "STATUS_CHANGE",
        description: "Order created",
      },
    ],
  } as Load;
  DB.loads.unshift(load);
  return load;
}

export function createCompany(
  name: string,
  type: Company["type"],
  plan: Company["plan"],
  branchCity: string,
  branchState: string,
  adminName: string,
  adminEmail: string,
  status: Company["status"] = "ACTIVE",
  dotNumber?: string,
  mcNumber?: string,
  _phone?: string,
  adminPassword?: string,
  branchAddress?: string
): { company: Company; admin: User } {
  const companyId = uid("co");
  const corporateBranchId = uid("br");
  const adminId = uid("usr");

  const corporateBranch: Branch = {
    id: corporateBranchId,
    companyId,
    name: `${name} — Corporate`,
    address: branchAddress || "",
    city: branchCity,
    state: branchState,
    level: "CORPORATE",
    managerId: adminId,
  };
  DB.branches.push(corporateBranch);

  const company: Company = {
    id: companyId,
    name,
    type,
    dotNumber: dotNumber || (type === "CARRIER" ? String(Math.floor(Math.random() * 3000000) + 1000000) : undefined),
    mcNumbers: mcNumber ? [mcNumber] : (type === "CARRIER" || type === "BROKER" ? [`MC-${Math.floor(Math.random() * 900000) + 100000}`] : undefined),
    branches: [corporateBranch],
    plan,
    rating: 4.5,
    mrrUsd: plan === "STARTER" ? 1200 : plan === "GROWTH" ? 3500 : 9800,
    status,
  };
  DB.companies.push(company);

  const roleMap: Record<Company["type"], User["role"]> = {
    CARRIER: "CARRIER_CORP",
    BROKER: "BROKER_CORP",
    SHIPPER_RECEIVER: "SHIPPER_RECEIVER",
  };
  const admin: User = {
    id: adminId,
    name: adminName,
    email: adminEmail,
    role: roleMap[type],
    companyId,
    branchIds: ["ALL"],
    permissions: [],
    lastActive: now(),
  };
  DB.users.push(admin);

  // Store password for demo purposes (in production, this would be hashed)
  if (adminPassword) {
    (admin as User & { password?: string }).password = adminPassword;
  }

  corporateBranch.managerId = adminId;

  return { company, admin };
}

export function approveCompany(companyId: string): Company | null {
  const company = DB.companies.find((c) => c.id === companyId);
  if (!company) return null;
  company.status = "ACTIVE";
  return company;
}

export function declineCompany(companyId: string): Company | null {
  const company = DB.companies.find((c) => c.id === companyId);
  if (!company) return null;
  company.status = "DECLINED";
  return company;
}
