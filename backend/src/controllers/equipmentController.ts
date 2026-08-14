import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import Equipment from "../models/Equipment";
import { scopeFilter, parseScope } from "../utils/applyScope";
import { uid } from "../utils/ids";

// GET /api/equipment?branchId=&companyId=
const getEquipment = asyncHandler(async (req: Request, res: Response) => {
  const scope = parseScope(req.query, req.user);
  const query = scopeFilter(scope, req.user);
  const equipment = await Equipment.find(query).sort({ unitNumber: 1 });
  const transformed = equipment.map(e => ({ ...e.toObject(), id: e._id }));
  res.json({ success: true, data: transformed });
});

// GET /api/equipment/:id
const getEquipmentById = asyncHandler(async (req: Request, res: Response) => {
  const scope = parseScope({}, req.user);
  const query = scopeFilter(scope, req.user);
  query._id = req.params.id;
  
  const item = await Equipment.findOne(query);
  if (!item) {
    res.statusCode = 404;
    throw new Error("Equipment not found or access denied");
  }
  res.json({ success: true, data: { ...item.toObject(), id: item._id } });
});

// POST /api/equipment — with transaction support
const createEquipment = asyncHandler(async (req: Request, res: Response) => {
  const { type, unitNumber, branchId, vin, insuranceExpiry, photos, make, model, year, plates, dotNumber, mcNumbers, ifta, permits, prePass, tollAccounts, insurance } = req.body;
  if (!type || !unitNumber || !branchId) {
    res.statusCode = 400;
    throw new Error("Missing required fields: type, unitNumber, branchId");
  }
  if (!photos || photos.length === 0) {
    res.statusCode = 400;
    throw new Error("Photos are required");
  }

  // Derive companyId from the authenticated user's company
  const companyId = req.user?.companyId;
  if (!companyId) {
    res.statusCode = 400;
    throw new Error("User must belong to a company to create equipment");
  }

  const session = await Equipment.startSession();
  session.startTransaction();

  try {
    const equipment = await Equipment.create([{
      _id: uid("eq"),
      type,
      unitNumber,
      branchId,
      companyId,
      vin,
      make: make || "",
      model: model || "",
      year: year || new Date().getFullYear(),
      plates: plates || [],
      dotNumber,
      mcNumbers: mcNumbers || [],
      ifta: ifta || "",
      permits: permits || [],
      prePass,
      tollAccounts: tollAccounts || [],
      insurance: insurance || { carrier: "", policy: "", expiry: insuranceExpiry || "" },
      inspections: [],
      maintenance: [],
      photos: photos || [],
    }], { session });

    await session.commitTransaction();

    res.status(201).json({ success: true, data: { ...equipment[0].toObject(), id: equipment[0]._id } });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export { getEquipment, getEquipmentById, createEquipment };
