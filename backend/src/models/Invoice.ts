import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // e.g. 'inv-1'
    loadId: { type: String, required: true, index: true },
    companyId: { type: String, required: true, index: true },
    number: String,
    status: {
      type: String,
      enum: ["DRAFT", "SENT", "VIEWED", "PAID", "OVERDUE"],
      default: "DRAFT",
    },
    issuedAt: String,
    dueAt: String,
    terms: String,
    billTo: String,
    remitTo: String,
    lines: [{ description: String, qty: Number, rate: Number, amount: Number }],
    subtotal: Number,
    total: Number,
    attachedDocIds: [String],
    marginUsd: Number,
  },
  { versionKey: false, timestamps: true }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
