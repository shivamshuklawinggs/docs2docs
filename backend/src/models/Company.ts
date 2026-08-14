import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. 'co-1'
    name: { type: String, required: true },
    type: { type: String, enum: ["CARRIER", "BROKER", "SHIPPER_RECEIVER"], required: true, immutable: true },
    dotNumber: String,
    mcNumbers: [String],
    branches: [{ type: String, ref: "Branch" }], // branch ids
    userIds: [{ type: String, ref: "User" }], // All users belonging to this company
    plan: { type: String, enum: ["STARTER", "GROWTH", "ENTERPRISE"], default: "STARTER" },
    rating: { type: Number, default: 4.5 },
    logoUrl: String,
    mrrUsd: Number,
    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "SUSPENDED", "TRIAL", "DECLINED"],
      default: "PENDING",
    },
  },
  { versionKey: false, _id: false, timestamps: true }
);

const Company = mongoose.model("Company", companySchema);

export default Company;
