// Deterministic seed data generator (spec §9.2)
import type {
  Branch,
  Company,
  Doc,
  Driver,
  Equipment,
  Exception,
  Invoice,
  Load,
  LoadStatus,
  Notification,
  Review,
  Stop,
  User,
  Role,
  EquipmentType,
} from "@/types";
import { STATUS_STEP, STATUS_LABEL } from "@/lib/lifecycle";
import {
  CITIES,
  LANES,
  BRANCH_CITIES,
  FACILITY_NAMES,
  COMMODITIES,
  HAZMAT_COMMODITIES,
  SPECIAL_HANDLING,
  FIRST_NAMES,
  LAST_NAMES,
  CARRIER_NAMES,
  BROKER_NAMES,
  SHIPPER_NAMES,
  TRUCK_MAKES,
  TRAILER_MAKES,
} from "./reference";

// ---- Seeded PRNG (mulberry32) so data is stable across renders -----
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260814);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const chance = (p: number) => rnd() < p;

const NOW = new Date("2026-08-14T09:00:00-05:00").getTime();
const DAY = 86_400_000;
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

function fullName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}
function phone() {
  return `(${int(200, 989)}) 555-${String(int(0, 9999)).padStart(4, "0")}`;
}
function vin() {
  const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  let v = "";
  for (let i = 0; i < 17; i++) v += chars[Math.floor(rnd() * chars.length)];
  return v;
}
function plate() {
  const l = "ABCDEFGHJKLMNPRSTUVWXYZ";
  return `${l[int(0, 22)]}${l[int(0, 22)]}${l[int(0, 22)]}-${int(1000, 9999)}`;
}

// ============================================================
// Companies + branches
// ============================================================
const companies: Company[] = [];
const branches: Branch[] = [];

function makeCompany(
  name: string,
  type: Company["type"],
  branchCityCount: number,
  plan: Company["plan"]
): Company {
  const id = `co-${companies.length + 1}`;
  const corpCity = CITIES[BRANCH_CITIES[0]];
  const companyBranches: Branch[] = [];
  // Corporate HQ
  companyBranches.push({
    id: `br-${branches.length + 1}`,
    companyId: id,
    name: `${name} — Corporate`,
    address: `${int(100, 9999)} ${["Main", "Oak", "Maple", "Industrial", "Commerce"][int(0, 4)]} ${["St", "Ave", "Blvd", "Dr"][int(0, 3)]}`,
    city: corpCity.city,
    state: corpCity.state,
    level: "CORPORATE",
    managerId: "",
  });
  branches.push(companyBranches[0]);
  // Satellites
  const cities = [...BRANCH_CITIES].slice(1, 1 + branchCityCount);
  for (const c of cities) {
    const b: Branch = {
      id: `br-${branches.length + 1}`,
      companyId: id,
      name: `${name} — ${c}`,
      address: `${int(100, 9999)} ${["Main", "Oak", "Maple", "Industrial", "Commerce"][int(0, 4)]} ${["St", "Ave", "Blvd", "Dr"][int(0, 3)]}`,
      city: CITIES[c].city,
      state: CITIES[c].state,
      level: "SATELLITE",
      managerId: "",
    };
    companyBranches.push(b);
    branches.push(b);
  }
  const company: Company = {
    id,
    name,
    type,
    dotNumber: type === "CARRIER" ? String(int(1_000_000, 3_999_999)) : undefined,
    mcNumbers:
      type === "CARRIER" || type === "BROKER"
        ? [`MC-${int(100000, 999999)}`]
        : undefined,
    branches: companyBranches,
    plan,
    rating: Number((4.3 + rnd() * 0.6).toFixed(1)),
    mrrUsd: int(1200, 9800),
    status: "ACTIVE",
  };
  companies.push(company);
  return company;
}

const plans: Company["plan"][] = ["STARTER", "GROWTH", "ENTERPRISE"];
CARRIER_NAMES.forEach((n, i) => makeCompany(n, "CARRIER", i < 2 ? 3 : 2, plans[i % 3]));
BROKER_NAMES.forEach((n, i) => makeCompany(n, "BROKER", i < 1 ? 2 : 1, plans[i % 3]));
SHIPPER_NAMES.forEach((n, i) => makeCompany(n, "SHIPPER_RECEIVER", i < 1 ? 2 : 1, plans[i % 3]));

const carriers = companies.filter((c) => c.type === "CARRIER");
const brokers = companies.filter((c) => c.type === "BROKER");
const shippers = companies.filter((c) => c.type === "SHIPPER_RECEIVER");

// ============================================================
// Users (46 across roles) — includes the demo login accounts
// ============================================================
const users: User[] = [];
function makeUser(
  name: string,
  email: string,
  role: Role,
  companyId: string,
  branchIds: string[]
): User {
  const u: User = {
    id: `usr-${users.length + 1}`,
    name,
    email,
    role,
    companyId,
    branchIds,
    permissions: [],
    lastActive: iso(NOW - int(0, 72) * HOUR),
  };
  users.push(u);
  return u;
}

// Demo accounts (spec §8.1)
const demoCarrierCorp = makeUser(
  "Priya Sharma",
  "carrier@docks2doc.demo",
  "CARRIER_CORP",
  carriers[0].id,
  ["ALL"]
);
const demoCarrierBranch = makeUser(
  "Marcus Bell",
  "dispatch@docks2doc.demo",
  "CARRIER_BRANCH",
  carriers[0].id,
  [carriers[0].branches.find((b) => b.city === "Dallas")?.id ?? carriers[0].branches[1].id]
);
const demoBroker = makeUser(
  "Elena Vasquez",
  "broker@docks2doc.demo",
  "BROKER_CORP",
  brokers[0].id,
  ["ALL"]
);
const demoShipper = makeUser(
  "Tom Whitfield",
  "warehouse@docks2doc.demo",
  "SHIPPER_RECEIVER",
  shippers[0].id,
  ["ALL"]
);
const demoAdmin = makeUser(
  "Dana Cross",
  "admin@docks2doc.demo",
  "SUPER_ADMIN",
  companies[0].id,
  ["ALL"]
);

// Fill remaining users up to 46
const roleByType: Record<Company["type"], Role[]> = {
  CARRIER: ["CARRIER_CORP", "CARRIER_BRANCH"],
  BROKER: ["BROKER_CORP", "BROKER_BRANCH"],
  SHIPPER_RECEIVER: ["SHIPPER_RECEIVER"],
};
while (users.length < 46) {
  const co = pick(companies);
  const branch = pick(co.branches);
  const role =
    branch.level === "CORPORATE"
      ? roleByType[co.type][0]
      : pick(roleByType[co.type]);
  const name = fullName();
  makeUser(
    name,
    `${name.toLowerCase().replace(/[^a-z]/g, ".")}@${co.name
      .toLowerCase()
      .replace(/[^a-z]/g, "")}.com`,
    role,
    co.id,
    branch.level === "CORPORATE" ? ["ALL"] : [branch.id]
  );
}

// ============================================================
// Equipment (64: 28 tractors, 30 trailers, 6 chassis; 3 failed inspections)
// ============================================================
const equipment: Equipment[] = [];
function makeEquipment(
  type: Equipment["type"],
  idx: number,
  branchId: string,
  forceFail = false
): Equipment {
  const isTrailer = type === "TRAILER";
  const spec = isTrailer ? pick(TRAILER_MAKES) : pick(TRUCK_MAKES);
  const prefix =
    type === "TRACTOR" ? "TRK" : type === "TRAILER" ? "TRL" : type === "CHASSIS" ? "CHS" : "CNT";
  return {
    id: `eq-${equipment.length + 1}`,
    type,
    unitNumber: `${prefix}-${String(idx).padStart(4, "0")}`,
    make: spec.make,
    model: spec.model,
    year: int(2018, 2024),
    vin: vin(),
    plates: [{ state: "TX", number: plate(), expiry: iso(NOW + int(30, 700) * DAY) }],
    dotNumber: String(int(1_000_000, 3_999_999)),
    mcNumbers: [`MC-${int(100000, 999999)}`],
    ifta: `IFTA-${int(10000, 99999)}`,
    permits: ["Oversize (state)", "Overweight (state)"],
    prePass: `PP-${int(100000, 999999)}`,
    tollAccounts: [`EZ-${int(10000, 99999)}`],
    insurance: {
      carrier: "Sentinel Freight Insurance",
      policy: `POL-${int(100000, 999999)}`,
      expiry: iso(NOW + (forceFail ? -10 : int(20, 500)) * DAY),
    },
    inspections: [
      {
        date: iso(NOW - int(10, 200) * DAY),
        result: forceFail ? "FAIL" : "PASS",
        notes: forceFail ? "Brake system out of adjustment — re-inspect" : undefined,
      },
    ],
    maintenance: [
      { date: iso(NOW - int(5, 90) * DAY), type: "Oil & filter", odometer: int(100000, 600000), cost: int(280, 620) },
      { date: iso(NOW - int(90, 300) * DAY), type: "Tire rotation", odometer: int(80000, 500000), cost: int(180, 400) },
    ],
    photos: [],
    branchId,
  };
}
let tractorIdx = 100;
let trailerIdx = 3300;
let chassisIdx = 500;
const carrierBranchesFlat = carriers.flatMap((c) => c.branches);
const corporateBranches = carriers.flatMap((c) => c.branches.filter(b => b.level === "CORPORATE"));
const satelliteBranches = carriers.flatMap((c) => c.branches.filter(b => b.level === "SATELLITE"));

// Ensure corporate branches get some equipment
for (const corpBranch of corporateBranches) {
  for (let i = 0; i < 3; i++) {
    equipment.push(makeEquipment("TRACTOR", tractorIdx++, corpBranch.id, false));
  }
  for (let i = 0; i < 4; i++) {
    equipment.push(makeEquipment("TRAILER", trailerIdx++, corpBranch.id, false));
  }
}
// Distribute remaining equipment across all branches
for (let i = 0; i < 19; i++)
  equipment.push(makeEquipment("TRACTOR", tractorIdx++, pick(satelliteBranches).id, i < 2));
for (let i = 0; i < 18; i++)
  equipment.push(makeEquipment("TRAILER", trailerIdx++, pick(satelliteBranches).id, i === 0));
for (let i = 0; i < 6; i++)
  equipment.push(makeEquipment("CHASSIS", chassisIdx++, pick(carrierBranchesFlat).id));

const tractors = equipment.filter((e) => e.type === "TRACTOR");
const trailers = equipment.filter((e) => e.type === "TRAILER");

// ============================================================
// Drivers (38: 12 available, 21 on load, 5 off duty; 4 expiring docs)
// ============================================================
const drivers: Driver[] = [];
const ENDORSEMENTS = ["Hazmat", "Tanker", "Doubles/Triples", "TWIC"];
function makeDriver(
  status: Driver["driver"]["status"],
  expiring: boolean,
  branchId: string,
  carrierId: string
): Driver {
  const tractor = pick(tractors);
  const trailer = pick(trailers);
  return {
    id: `drv-${drivers.length + 1}`,
    name: fullName(),
    email: `${fullName().toLowerCase().replace(/\s/g, ".")}@docks2doc.demo`,
    role: "DRIVER",
    companyId: carrierId,
    branchIds: [branchId],
    driver: {
      phone: phone(),
      photoUrl: "",
      status,
      carrierId,
      addresses: [`${int(100, 9999)} ${pick(["Elm", "Oak", "Maple", "Cedar"])} St, ${pick(BRANCH_CITIES)}`],
      phones: [phone()],
      emergencyContacts: [{ name: fullName(), phone: phone() }],
      licenses: [
        {
          state: "TX",
          number: `CDL-${int(1000000, 9999999)}`,
          class: "A",
          expiry: iso(NOW + (expiring ? int(3, 25) : int(200, 1000)) * DAY),
        },
      ],
      twic: chance(0.7) ? { number: `TWIC-${int(100000, 999999)}`, expiry: iso(NOW + int(100, 800) * DAY) } : undefined,
      endorsements: chance(0.5) ? ["Hazmat", pick(ENDORSEMENTS)] : [pick(ENDORSEMENTS)],
      medicalCertExpiry: iso(NOW + (expiring ? int(5, 28) : int(100, 700)) * DAY),
      workHistory: [
        { employer: pick(CARRIER_NAMES), from: iso(NOW - int(400, 1200) * DAY) },
      ],
      currentTractorId: status === "ON_LOAD" ? tractor.id : undefined,
      currentTrailerId: status === "ON_LOAD" ? trailer.id : undefined,
      rating: Number((4.2 + rnd() * 0.8).toFixed(1)),
      loadsCompleted: int(40, 320),
      lastPing:
        status === "ON_LOAD" || status === "AVAILABLE"
          ? { lat: 32 + rnd() * 8, lng: -96 - rnd() * 20, at: iso(NOW - int(1, 30) * 60000) }
          : undefined,
    },
  };
}
const driverPlan: { status: Driver["driver"]["status"]; count: number }[] = [
  { status: "AVAILABLE", count: 12 },
  { status: "ON_LOAD", count: 21 },
  { status: "OFF_DUTY", count: 5 },
];
let expiringLeft = 4;

// Ensure corporate branches get some drivers
for (const corpBranch of corporateBranches) {
  const carrier = carriers.find((c) => c.branches.some((b) => b.id === corpBranch.id))!;
  for (let i = 0; i < 3; i++) {
    const expiring = expiringLeft > 0 && chance(0.3);
    if (expiring) expiringLeft--;
    drivers.push(makeDriver("AVAILABLE", expiring, corpBranch.id, carrier.id));
  }
  for (let i = 0; i < 2; i++) {
    const expiring = expiringLeft > 0 && chance(0.3);
    if (expiring) expiringLeft--;
    drivers.push(makeDriver("ON_LOAD", expiring, corpBranch.id, carrier.id));
  }
}

// Distribute remaining drivers across all branches
for (const { status, count } of driverPlan) {
  for (let i = 0; i < count; i++) {
    const expiring = expiringLeft > 0 && chance(0.3);
    if (expiring) expiringLeft--;
    const carrier = pick(carriers);
    drivers.push(makeDriver(status, expiring, pick(satelliteBranches).id, carrier.id));
  }
}
// force any remaining expiring assignments onto the first drivers
for (let i = 0; expiringLeft > 0 && i < drivers.length; i++) {
  if (drivers[i].driver?.licenses?.[0]) {
    drivers[i].driver!.licenses![0]!.expiry = iso(NOW + int(3, 25) * DAY);
  }
  expiringLeft--;
}

// ============================================================
// Loads (120) across all statuses; 90 days back → 14 forward
// ============================================================
const STATUS_WEIGHTS: { status: LoadStatus; weight: number }[] = [
  { status: "DRAFT", weight: 8 },
  { status: "DISPATCHED", weight: 10 },
  { status: "ASSIGNED", weight: 10 },
  { status: "AT_PICKUP", weight: 8 },
  { status: "LOADED", weight: 8 },
  { status: "IN_TRANSIT", weight: 18 },
  { status: "AT_DELIVERY", weight: 6 },
  { status: "DELIVERED", weight: 14 },
  { status: "INVOICED", weight: 12 },
  { status: "PAID", weight: 16 },
];
function weightedStatus(): LoadStatus {
  const total = STATUS_WEIGHTS.reduce((s, x) => s + x.weight, 0);
  let r = rnd() * total;
  for (const x of STATUS_WEIGHTS) {
    if (r < x.weight) return x.status;
    r -= x.weight;
  }
  return "IN_TRANSIT";
}

function makeStop(cityKey: keyof typeof CITIES, baseMs: number): Stop {
  const c = CITIES[cityKey];
  return {
    facilityName: pick(FACILITY_NAMES),
    address: `${int(100, 9999)} ${pick(["Distribution", "Bayline", "Commerce", "Industrial", "Terminal"])} ${pick(["Pkwy", "Rd", "Blvd", "Way"])}`,
    city: c.city,
    state: c.state,
    zip: String(int(10000, 99999)),
    contactName: fullName(),
    contactPhone: phone(),
    windowStart: iso(baseMs),
    windowEnd: iso(baseMs + 2 * HOUR),
    dockDoor: chance(0.5) ? `Door ${int(1, 24)}` : undefined,
    instructions: chance(0.4) ? "Check in at guard shack. PPE required on dock." : undefined,
    lat: c.lat + (rnd() - 0.5) * 0.1,
    lng: c.lng + (rnd() - 0.5) * 0.1,
  };
}

const loads: Load[] = [];
const documents: Doc[] = [];
const invoices: Invoice[] = [];
let loadNum = 24700;
let docNum = 1;

const EQUIP: EquipmentType[] = ["DRY_VAN_53", "REEFER", "FLATBED", "STEP_DECK", "CHASSIS"];

// counters to satisfy distribution rules (spec §9.2)
let needExceptions = 4;
let needUnassigned = 6;
let needUnbilled = 12;
let needDetention = 3;

for (let i = 0; i < 120; i++) {
  const id = `D2D-${loadNum++}`;
  let status = weightedStatus();

  // enforce unassigned quota by forcing some DISPATCHED
  if (needUnassigned > 0 && i % 17 === 0) {
    status = "DISPATCHED";
    needUnassigned--;
  }
  // enforce unbilled quota → DELIVERED
  if (needUnbilled > 0 && i % 9 === 0) {
    status = "DELIVERED";
    needUnbilled--;
  }

  const step = STATUS_STEP[status];
  const lane = pick(LANES);
  // Ensure corporate branches get some loads (first 20 loads)
  const branch = i < 20 ? pick(corporateBranches) : pick(satelliteBranches);
  const carrier = carriers.find((c) => c.branches.some((b) => b.id === branch.id))!;
  const broker = pick(brokers);
  const shipper = pick(shippers);
  const receiver = pick(shippers);
  const hasDriver = ["ASSIGNED", "AT_PICKUP", "LOADED", "IN_TRANSIT", "AT_DELIVERY", "DELIVERED", "INVOICED", "PAID"].includes(status);
  const driver = hasDriver ? pick(drivers) : undefined;

  // time base: draft/dispatched in future, in-transit near now, delivered in past
  let pickupBase: number;
  if (["DRAFT", "DISPATCHED", "ASSIGNED"].includes(status)) pickupBase = NOW + int(0, 14) * DAY;
  else if (["AT_PICKUP", "LOADED", "IN_TRANSIT", "AT_DELIVERY"].includes(status)) pickupBase = NOW - int(0, 2) * DAY;
  else pickupBase = NOW - int(3, 90) * DAY;

  const pickup = makeStop(lane.from, pickupBase);
  const delivery = makeStop(lane.to, pickupBase + DAY);

  const isHazmat = chance(0.15);
  const haz = isHazmat ? pick(HAZMAT_COMMODITIES) : null;
  const weightLb = int(8000, 44000);
  const customerRate = int(1200, 4800);
  const carrierRate = Math.round(customerRate * (0.78 + rnd() * 0.1));

  const exceptions: Exception[] = [];
  let onTime = chance(0.9);
  if (needExceptions > 0 && chance(0.4) && step >= 4 && step <= 7) {
    const detention = needDetention > 0 && chance(0.6);
    exceptions.push({
      id: `exc-${id}`,
      loadId: id,
      type: detention ? "DETENTION" : pick(["DELAY", "DAMAGE", "DOC_ISSUE"] as const),
      description: detention
        ? "Driver held at dock awaiting product."
        : "En-route delay reported by driver.",
      openedAt: iso(NOW - int(1, 6) * HOUR),
      detentionMinutes: detention ? int(130, 190) : undefined,
    });
    onTime = false;
    needExceptions--;
    if (detention) needDetention--;
  }

  const milesTotal = lane.miles;
  const milesRemaining = status === "IN_TRANSIT" ? int(20, milesTotal - 20) : undefined;

  const load: Load = {
    id,
    _id: id,
    status,
    step,
    branchId: branch.id,
    shipperId: shipper.id,
    receiverId: receiver.id,
    brokerId: broker.id,
    carrier: status === "DRAFT" ? undefined : {
      carrierId: carrier.id,
      branchId: pick(carrier.branches).id,
      assignedAt: new Date().toISOString(),
    },
    driverId: driver?.id,
    tractorId: driver?.driver?.currentTractorId ?? (hasDriver ? pick(tractors).id : undefined),
    trailerId: driver?.driver?.currentTrailerId ?? (hasDriver ? pick(trailers).id : undefined),
    pickup,
    delivery,
    freight: {
      commodity: haz ? haz.commodity : pick(COMMODITIES),
      pieces: int(10, 30),
      weightLb,
      palletCount: int(12, 26),
      hazmat: isHazmat,
      unNumber: haz?.unNumber,
      hazmatClass: haz?.hazmatClass,
      packingGroup: haz?.packingGroup,
      emergencyContact: haz ? phone() : undefined,
      temperatureF: chance(0.25) ? { min: 34, max: 40 } : undefined,
      declaredValueUsd: int(20000, 120000),
      specialHandling: chance(0.5) ? [pick(SPECIAL_HANDLING)] : [],
    },
    equipmentType: pick(EQUIP),
    requiredQualifications: isHazmat ? ["Hazmat endorsement"] : [],
    milesTotal,
    milesRemaining,
    etaDelivery: iso(pickupBase + DAY + int(-2, 3) * HOUR),
    onTime,
    rates: { customerRateUsd: customerRate, carrierRateUsd: status === "DRAFT" ? undefined : carrierRate },
    references: {
      po: `PO-${int(80000, 89999)}`,
      bol: `${id.replace("D2D-", "")}-A`,
      customerRef: chance(0.5) ? `REF-${int(1000, 9999)}` : undefined,
    },
    documents: [],
    events: [],
    exceptions,
    currentPosition:
      status === "IN_TRANSIT"
        ? {
            lat: (pickup.lat + delivery.lat) / 2 + (rnd() - 0.5) * 0.3,
            lng: (pickup.lng + delivery.lng) / 2 + (rnd() - 0.5) * 0.3,
            updatedAt: iso(NOW - int(1, 10) * 60000),
            speedMph: int(0, 68),
          }
        : undefined,
    createdAt: iso(pickupBase - int(1, 5) * DAY),
  };

  // Documents — at least 3 per non-draft load
  if (status !== "DRAFT") {
    const docTypes: Doc["type"][] = ["BOL", "WEIGHT_TICKET", "PHOTO"];
    if (step >= 7) docTypes.push("POD");
    if (["INVOICED", "PAID"].includes(status)) docTypes.push("INVOICE");
    for (const t of docTypes) {
      const signed = (t === "BOL" && step >= 5) || (t === "POD" && step >= 7);
      const doc: Doc = {
        id: `doc-${docNum++}`,
        loadId: id,
        type: t,
        fileName: `${id}-${t}.pdf`,
        uploadedBy: driver?.name ?? "System",
        uploadedAt: iso(pickupBase + int(0, 20) * HOUR),
        signed,
        signedBy: signed ? pick([shipper.name, receiver.name, driver?.name ?? "Driver"]) : undefined,
        signedAt: signed ? iso(pickupBase + int(1, 22) * HOUR) : undefined,
        signatureMethod: signed ? pick(["LIVE", "SAVED", "REMOTE"] as const) : undefined,
        gps: signed ? { lat: pickup.lat, lng: pickup.lng } : undefined,
        auditTrail: [
          { actor: driver?.name ?? "System", action: "Uploaded", at: iso(pickupBase) },
          ...(signed ? [{ actor: shipper.name, action: "Signed", at: iso(pickupBase + HOUR) }] : []),
        ],
      };
      documents.push(doc);
      load.documents.push(doc);
    }
  }

  // Events — status changes up to current step
  const eventStatuses: LoadStatus[] = ["DRAFT", "DISPATCHED", "ASSIGNED", "AT_PICKUP", "LOADED", "IN_TRANSIT", "AT_DELIVERY", "DELIVERED", "INVOICED", "PAID"];
  const curIdx = eventStatuses.indexOf(status);
  for (let e = 0; e <= curIdx; e++) {
    const s = eventStatuses[e];
    load.events.push({
      id: `evt-${id}-${e}`,
      loadId: id,
      at: iso(load.createdAt ? new Date(load.createdAt).getTime() + e * 6 * HOUR : NOW),
      actor: "System",
      actorRole: "SYSTEM",
      type: "STATUS_CHANGE",
      description: `Load moved to ${STATUS_LABEL[s]}`,
    });
  }
  for (const exc of exceptions) {
    load.events.push({
      id: `evt-${exc.id}`,
      loadId: id,
      at: exc.openedAt,
      actor: driver?.name ?? "Driver",
      actorRole: "DRIVER",
      type: "EXCEPTION",
      description: exc.description,
    });
  }
  load.events.reverse();

  // Invoice for invoiced/paid
  if (["INVOICED", "PAID"].includes(status)) {
    const detention = exceptions.find((e) => e.type === "DETENTION");
    const lines = [
      { description: "Linehaul", qty: 1, rate: carrierRate, amount: carrierRate },
      { description: "Fuel surcharge", qty: 1, rate: Math.round(carrierRate * 0.12), amount: Math.round(carrierRate * 0.12) },
    ];
    if (detention) {
      const amt = Math.round((detention.detentionMinutes! / 60) * 65);
      lines.push({ description: `Detention (${detention.detentionMinutes} min)`, qty: 1, rate: amt, amount: amt });
    }
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    const inv: Invoice = {
      id: `inv-${invoices.length + 1}`,
      loadId: id,
      number: `INV-${26000 + invoices.length}`,
      status: status === "PAID" ? "PAID" : pick(["SENT", "VIEWED", "OVERDUE"] as const),
      issuedAt: iso(pickupBase + DAY + 2 * HOUR),
      dueAt: iso(pickupBase + DAY + 30 * DAY),
      terms: "Net 30",
      billTo: shipper.name,
      remitTo: carrier.name,
      lines,
      subtotal,
      total: subtotal,
      attachedDocIds: load.documents.filter((d) => d.type === "BOL" || d.type === "POD").map((d) => d.id),
      marginUsd: customerRate - carrierRate,
    };
    invoices.push(inv);
    load.invoiceId = inv.id;
  }

  loads.push(load);
}

// ============================================================
// Reviews (90)
// ============================================================
const reviews: Review[] = [];
const reviewComments = [
  "On time and communicative throughout.",
  "Paperwork was clean and complete.",
  "Minor delay at pickup but kept us posted.",
  "Professional driver, careful with freight.",
  "Great coverage on a tough lane.",
  "Detention handled without drama.",
];
for (let i = 0; i < 90; i++) {
  const subjectType = pick(["DRIVER", "CARRIER", "BROKER", "SHIPPER"] as const);
  const subjectId =
    subjectType === "DRIVER"
      ? pick(drivers).id
      : subjectType === "CARRIER"
      ? pick(carriers).id
      : subjectType === "BROKER"
      ? pick(brokers).id
      : pick(shippers).id;
  reviews.push({
    id: `rev-${i + 1}`,
    subjectId,
    subjectType,
    reviewerName: fullName(),
    reviewerRole: pick(["Dispatcher", "Broker agent", "Warehouse lead", "Ops manager"]),
    loadRef: `D2D-${int(24700, 24819)}`,
    stars: int(3, 5),
    comment: pick(reviewComments),
    date: iso(NOW - int(1, 300) * DAY),
    response: chance(0.25) ? "Thanks for the feedback — glad it went smoothly." : undefined,
  });
}

// ============================================================
// Notifications (24, incl. two live 5-mile arrival alerts)
// ============================================================
const notifications: Notification[] = [];
const inTransitLoads = loads.filter((l) => l.status === "IN_TRANSIT");
for (let i = 0; i < 2 && i < inTransitLoads.length; i++) {
  const l = inTransitLoads[i];
  notifications.push({
    id: `ntf-${notifications.length + 1}`,
    loadId: l.id,
    kind: "ARRIVAL_5MI",
    title: `${l.id} — 5 miles from delivery`,
    body: `${l.delivery.facilityName}, ${l.delivery.city} ${l.delivery.state}. Prepare dock door.`,
    at: iso(NOW - int(2, 15) * 60000),
    read: false,
    pinned: true,
  });
}
while (notifications.length < 24) {
  const l = pick(loads);
  notifications.push({
    id: `ntf-${notifications.length + 1}`,
    loadId: l.id,
    kind: pick(["STATUS", "DOC", "EXCEPTION", "SYSTEM"] as const),
    title: `${l.id} — ${STATUS_LABEL[l.status]}`,
    body: `${l.pickup.city} → ${l.delivery.city}. ${pick(["BOL uploaded", "Driver assigned", "ETA updated", "Document signed"])}.`,
    at: iso(NOW - int(1, 48) * HOUR),
    read: chance(0.4),
  });
}

// ============================================================
// Seed bundle
// ============================================================
export const SEED = {
  companies,
  branches,
  users,
  drivers,
  equipment,
  loads,
  documents,
  invoices,
  reviews,
  notifications,
  demoUsers: {
    "carrier@docks2doc.demo": demoCarrierCorp,
    "dispatch@docks2doc.demo": demoCarrierBranch,
    "broker@docks2doc.demo": demoBroker,
    "warehouse@docks2doc.demo": demoShipper,
    "admin@docks2doc.demo": demoAdmin,
  } as Record<string, User>,
};

export type SeedData = typeof SEED;
