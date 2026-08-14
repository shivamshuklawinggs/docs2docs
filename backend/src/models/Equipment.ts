import mongoose from "mongoose";

const equipmentSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. 'eq-1'
    type: { type: String, enum: ["TRACTOR", "TRAILER", "CONTAINER", "CHASSIS"], required: true },
    unitNumber: String,
    make: String,
    model: String,
    year: Number,
    vin: String,
    plates: [{ state: String, number: String, expiry: String }],
    dotNumber: String,
    mcNumbers: [String],
    ifta: String,
    permits: [String],
    prePass: String,
    tollAccounts: [String],
    insurance: { carrier: String, policy: String, expiry: String },
    inspections: [{ date: String, result: { type: String, enum: ["PASS", "FAIL"] }, notes: String }],
    maintenance: [{ date: String, type: String, odometer: Number, cost: Number }],
    photos: [String],
    branchId: { type: String, index: true },
    companyId: { type: String, required: true, index: true },
  },
  { versionKey: false, timestamps: true }
);

const Equipment = mongoose.model("Equipment", equipmentSchema);

export default Equipment;
