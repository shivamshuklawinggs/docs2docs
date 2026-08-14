import mongoose from "mongoose";

const stopSchema = new mongoose.Schema(
  {
    facilityName: String,
    address: String,
    city: String,
    state: String,
    zip: String,
    contactName: String,
    contactPhone: String,
    windowStart: String,
    windowEnd: String,
    actualArrival: String,
    actualDeparture: String,
    dockDoor: String,
    instructions: String,
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const freightSchema = new mongoose.Schema(
  {
    commodity: String,
    pieces: Number,
    weightLb: Number,
    palletCount: Number,
    hazmat: { type: Boolean, default: false },
    unNumber: String,
    hazmatClass: String,
    packingGroup: String,
    emergencyContact: String,
    temperatureF: { min: Number, max: Number },
    declaredValueUsd: Number,
    customerRateUsd: Number,
    carrierRateUsd: Number,
    specialHandling: [String],
  },
  { _id: false }
);

const docSchema = new mongoose.Schema(
  {
    id: String,
    loadId: String,
    type: {
      type: String,
      enum: ["BOL", "POD", "INVOICE", "INSPECTION", "RECEIPT", "PHOTO", "WEIGHT_TICKET"],
    },
    fileName: String,
    uploadedBy: String,
    uploadedAt: String,
    signed: { type: Boolean, default: false },
    signedBy: String,
    signedAt: String,
    signatureMethod: { type: String, enum: ["LIVE", "SAVED", "REMOTE"] },
    gps: { lat: Number, lng: Number },
    auditTrail: [{ actor: String, action: String, at: String }],
  },
  { _id: false }
);

const loadEventSchema = new mongoose.Schema(
  {
    id: String,
    loadId: String,
    at: String,
    actor: String,
    actorRole: String,
    type: {
      type: String,
      enum: ["STATUS_CHANGE", "DOC", "MESSAGE", "GEOFENCE", "ASSIGNMENT", "EXCEPTION"],
    },
    description: String,
  },
  { _id: false }
);

const exceptionSchema = new mongoose.Schema(
  {
    id: String,
    loadId: String,
    type: { type: String, enum: ["DELAY", "DAMAGE", "REFUSAL", "DOC_ISSUE", "DETENTION"] },
    description: String,
    openedAt: String,
    resolvedAt: String,
    detentionMinutes: Number,
  },
  { _id: false }
);

const carrierAssignmentSchema = new mongoose.Schema(
  {
    carrierId: String,
    branchId: String,
    assignedAt: { type: String, default: () => new Date().toISOString() },
  },
  { _id: false }
);

const loadSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. 'D2D-24817'
    status: {
      type: String,
      enum: [
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
        "CANCELLED",
      ],
      default: "DRAFT",
    },
    step: { type: Number, default: 1 },
    branchId: { type: String, index: true },
    companyId: { type: String, required: true, index: true },
    shipperId: String,
    receiverId: String,
    brokerId: String,
    carrier: carrierAssignmentSchema,
    driverId: String,
    tractorId: String,
    trailerId: String,
    pickups: [stopSchema],
    deliveries: [stopSchema],
    freight: freightSchema,
    equipmentType: {
      type: String,
      enum: ["DRY_VAN_53", "REEFER", "FLATBED", "STEP_DECK", "CHASSIS"],
    },
    requiredQualifications: [String],
    milesTotal: Number,
    milesRemaining: Number,
    etaDelivery: String,
    onTime: { type: Boolean, default: true },
    rates: { customerRateUsd: Number, carrierRateUsd: Number, carrierMarginUsd: Number },
    references: { po: String, bol: String, customerRef: String },
    documents: [docSchema],
    events: [loadEventSchema],
    exceptions: [exceptionSchema],
    currentPosition: { lat: Number, lng: Number, updatedAt: String, speedMph: Number },
    invoiceId: String,
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { versionKey: false, timestamps: true }
);

const Load = mongoose.model("Load", loadSchema);

export default Load;
