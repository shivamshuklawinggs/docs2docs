import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. 'br-1'
    companyId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    address: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, required: true },
    level: { type: String, enum: ["CORPORATE", "SATELLITE"], required: true },
    managerId: { type: String, default: "" },
  },
  { versionKey: false, _id: false, timestamps: true }
);

const Branch = mongoose.model("Branch", branchSchema);

export default Branch;
