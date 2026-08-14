// ============================================================
// Docks2Doc — core domain types (spec §9.1)
// ============================================================

export type Role =
  | "SUPER_ADMIN"
  | "CARRIER_CORP"
  | "CARRIER_BRANCH"
  | "BROKER_CORP"
  | "BROKER_BRANCH"
  | "SHIPPER_RECEIVER"
  | "DRIVER";

export type LoadStatus =
  | "DRAFT"
  | "DISPATCHED"
  | "ASSIGNED"
  | "AT_PICKUP"
  | "LOADED"
  | "IN_TRANSIT"
  | "AT_DELIVERY"
  | "DELIVERED"
  | "INVOICED"
  | "PAID"
  | "CANCELLED";

export type LifecycleStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type EquipmentType =
  | "DRY_VAN_53"
  | "REEFER"
  | "FLATBED"
  | "STEP_DECK"
  | "CHASSIS";

export type CompanyType = "CARRIER" | "BROKER" | "SHIPPER_RECEIVER";

export type ShipperMode = "OUTBOUND" | "INBOUND";

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  dotNumber?: string;
  mcNumbers?: string[];
  branches: Branch[];
  plan: "STARTER" | "GROWTH" | "ENTERPRISE";
  rating: number;
  logoUrl?: string;
  mrrUsd?: number;
  status?: "PENDING" | "ACTIVE" | "SUSPENDED" | "TRIAL" | "DECLINED";
}

export interface Branch {
  id: string;
  companyId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  level: "CORPORATE" | "SATELLITE";
  managerId: string;
}

export interface Stop {
  facilityName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  contactName: string;
  contactPhone: string;
  windowStart: string; // ISO
  windowEnd: string; // ISO
  actualArrival?: string;
  actualDeparture?: string;
  dockDoor?: string;
  instructions?: string;
  lat: number;
  lng: number;
}

export interface Freight {
  commodity: string;
  pieces: number;
  weightLb: number;
  palletCount?: number;
  hazmat: boolean;
  unNumber?: string;
  hazmatClass?: string;
  packingGroup?: string;
  emergencyContact?: string;
  temperatureF?: { min: number; max: number };
  declaredValueUsd: number;
  customerRateUsd?: number;
  carrierRateUsd?: number;
  specialHandling: string[];
}

export interface Load {
  id: string; // 'D2D-24817'
  _id: string; // 'D2D-24817'
  status: LoadStatus;
  step: LifecycleStep;
  branchId: string;
  shipperId: string;
  receiverId: string;
  brokerId?: string;
  carrier?: {
    carrierId: string;
    branchId: string;
    assignedAt: string;
  };
  driverId?: string;
  tractorId?: string;
  trailerId?: string;
  pickups: Stop[];
  deliveries: Stop[];
  freight: Freight;
  equipmentType: EquipmentType;
  requiredQualifications: string[];
  milesTotal: number;
  milesRemaining?: number;
  etaDelivery?: string;
  onTime: boolean;
  rates: { customerRateUsd: number; carrierRateUsd?: number; carrierMarginUsd?: number };
  references: { po?: string; bol?: string; customerRef?: string };
  documents: Doc[];
  events: LoadEvent[];
  exceptions: Exception[];
  currentPosition?: {
    lat: number;
    lng: number;
    updatedAt: string;
    speedMph: number;
  };
  invoiceId?: string;
  createdAt: string;
}

export type DocType =
  | "BOL"
  | "POD"
  | "INVOICE"
  | "INSPECTION"
  | "RECEIPT"
  | "PHOTO"
  | "WEIGHT_TICKET";

export interface Doc {
  id: string;
  loadId: string;
  type: DocType;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  signed: boolean;
  signedBy?: string;
  signedAt?: string;
  signatureMethod?: "LIVE" | "SAVED" | "REMOTE";
  gps?: { lat: number; lng: number };
  auditTrail: { actor: string; action: string; at: string }[];
}

export type LoadEventType =
  | "STATUS_CHANGE"
  | "DOC"
  | "MESSAGE"
  | "GEOFENCE"
  | "ASSIGNMENT"
  | "EXCEPTION";

export interface LoadEvent {
  id: string;
  loadId: string;
  at: string;
  actor: string;
  actorRole: Role | "DRIVER" | "SYSTEM";
  type: LoadEventType;
  description: string;
}

export type ExceptionType =
  | "DELAY"
  | "DAMAGE"
  | "REFUSAL"
  | "DOC_ISSUE"
  | "DETENTION";

export interface Exception {
  id: string;
  loadId: string;
  type: ExceptionType;
  description: string;
  openedAt: string;
  resolvedAt?: string;
  detentionMinutes?: number;
}

export interface DriverData {
  phone: string;
  photoUrl?: string;
  status: "AVAILABLE" | "ON_LOAD" | "OFF_DUTY" | "INACTIVE";
  carrierId?: string;
  addresses?: string[];
  phones?: string[];
  emergencyContacts?: { name: string; phone: string }[];
  licenses?: { state: string; number: string; class: string; expiry: string }[];
  twic?: { number: string; expiry: string };
  passport?: { number: string; expiry: string };
  endorsements?: string[];
  medicalCertExpiry?: string;
  workHistory?: { employer: string; from: string; to?: string }[];
  currentTractorId?: string;
  currentTrailerId?: string;
  currentLoadId?: string;
  rating?: number;
  loadsCompleted?: number;
  lastPing?: { lat: number; lng: number; at: string };
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  role: "DRIVER";
  companyId: string;
  branchIds: string[];
  driver: DriverData;
}

export interface Equipment {
  id: string;
  type: "TRACTOR" | "TRAILER" | "CONTAINER" | "CHASSIS";
  unitNumber: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  plates: { state: string; number: string; expiry: string }[];
  dotNumber?: string;
  mcNumbers?: string[];
  ifta?: string;
  permits: string[];
  prePass?: string;
  tollAccounts: string[];
  insurance: { carrier: string; policy: string; expiry: string };
  inspections: { date: string; result: "PASS" | "FAIL"; notes?: string }[];
  maintenance: {
    date: string;
    type: string;
    odometer: number;
    cost: number;
  }[];
  photos: string[];
  branchId: string;
  status?: "AVAILABLE" | "ON_LOAD" | "IN_MAINTENANCE" | "INACTIVE";
  currentDriverId?: string;
  currentLoadId?: string;
}

export interface Invoice {
  id: string;
  loadId: string;
  number: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "PAID" | "OVERDUE";
  issuedAt: string;
  dueAt: string;
  terms: string;
  billTo: string;
  remitTo: string;
  lines: { description: string; qty: number; rate: number; amount: number }[];
  subtotal: number;
  total: number;
  attachedDocIds: string[];
  marginUsd?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  branchIds: string[];
  permissions: Permission[];
  lastActive?: string;
  avatarUrl?: string;
  driver?: DriverData; // Nested driver data for DRIVER role users
}

export interface Review {
  id: string;
  subjectId: string; // driver / carrier / broker / shipper id
  subjectType: "DRIVER" | "CARRIER" | "BROKER" | "SHIPPER";
  reviewerName: string;
  reviewerRole: string;
  loadRef: string;
  stars: number;
  comment: string;
  date: string;
  response?: string;
}

export interface Notification {
  id: string;
  loadId?: string;
  kind: "ARRIVAL_5MI" | "STATUS" | "DOC" | "EXCEPTION" | "SYSTEM";
  title: string;
  body: string;
  at: string;
  read: boolean;
  pinned?: boolean;
}

// ---- RBAC ----------------------------------------------------

export type Permission =
  | "view:margin"
  | "manage:users"
  | "manage:billing"
  | "manage:branches"
  | "assign:driver"
  | "sign:documents"
  | "create:order"
  | "dispatch:load"
  | "impersonate"
  | "view:compliance"
  | "manage:ads";

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string; // lucide icon name
  section?: "main" | "corporate" | "admin";
}

// ---- Session / scope ----------------------------------------

export interface Scope {
  companyId: string;
  branchId: string | "ALL";
  role: Role;
}

export interface LoadFilter {
  status?: LoadStatus[];
  branchId?: string;
  equipmentType?: EquipmentType;
  search?: string;
  savedView?: string;
}
