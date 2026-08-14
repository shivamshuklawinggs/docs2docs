import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import Invoice from "../models/Invoice";
import Load from "../models/Load";
import { scopeFilter, parseScope } from "../utils/applyScope";

// GET /api/invoices?branchId=&companyId=
const getInvoices = asyncHandler(async (req: Request, res: Response) => {
  const scope = parseScope(req.query);
  const scopedLoads = await Load.find(scopeFilter(scope)).select("_id");
  const loadIds = scopedLoads.map((l) => l._id);
  const invoices = await Invoice.find({ loadId: { $in: loadIds } }).sort({ issuedAt: -1 });
  res.json({ success: true, data: invoices });
});

export { getInvoices };
