import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import Load from "../models/Load";
import User, { IDriver } from "../models/User";
import Equipment from "../models/Equipment";
import Invoice from "../models/Invoice";
import Notification from "../models/Notification";
import Company from "../models/Company";
import { STATUS_STEP, STATUS_LABEL, nextStatus } from "../utils/lifecycle";
import { loadScopeFilter, parseScope } from "../utils/applyScope";
import { uid, now } from "../utils/ids";

// Mirrors lib/mock/api.ts `matches(filter)` — applied in-memory after the
// branch-scope query so saved-view logic stays identical to the frontend spec.
function matchesFilter(load: any, filter: any): boolean {
  if (filter.status?.length && !filter.status.includes(load.status)) return false;
  if (filter.branchId && filter.branchId !== "ALL" && load.branchId !== filter.branchId) return false;
  if (filter.equipmentType && load.equipmentType !== filter.equipmentType) return false;
  if (filter.search) {
    const q = filter.search.toLowerCase();
    const pickupCity = load.pickups?.[0]?.city ?? "";
    const deliveryCity = load.deliveries?.[load.deliveries.length - 1]?.city ?? "";
    const hay = `${load._id} ${pickupCity} ${deliveryCity} ${load.references?.po ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (filter.savedView === "needs-driver") return !load.driverId && load.status !== "DRAFT";
  if (filter.savedView === "at-risk")
    return load.exceptions.some((e: any) => !e.resolvedAt) || !load.onTime;
  if (filter.savedView === "delivered-unbilled") return load.status === "DELIVERED";
  if (filter.savedView === "active")
    return !["PAID", "CANCELLED", "INVOICED"].includes(load.status);
  return true;
}

function pushEvent(load: any, ev: any) {
  (load as any).events.unshift({ id: uid("evt"), loadId: load._id, ...ev });
}

function signDoc(load: any, type: string, signer: string) {
  let doc = load.documents.find((d: any) => d.type === type);
  if (!doc) {
    doc = {
      id: uid("doc"),
      loadId: load._id,
      type,
      fileName: `${load._id}-${type}.pdf`,
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
  const firstPickup = load.pickups?.[0];
  doc.gps = firstPickup ? { lat: firstPickup.lat, lng: firstPickup.lng } : { lat: 0, lng: 0 };
  doc.auditTrail.push({ actor: signer, action: "Signed", at: now() });
  pushEvent(load, {
    at: now(),
    actor: signer,
    actorRole: "SYSTEM",
    type: "DOC",
    description: `${type} signed by ${signer}`,
  });
}

async function generateInvoice(load: any, session?: any) {
  if (load.invoiceId) return;
  const carrierRate = load.rates?.carrierRateUsd ?? 0;
  const detention = load.exceptions.find((e: any) => e.type === "DETENTION" && !e.resolvedAt);
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
  const subtotal = lines.reduce((s: number, l: any) => s + l.amount, 0);
  const invoiceCount = await Invoice.countDocuments().session(session || null);
  const shipper = load.shipperId ? await Company.findById(load.shipperId).session(session || null) : null;
  const carrier = load.carrier?.carrierId ? await Company.findById(load.carrier.carrierId).session(session || null) : null;

  const inv = await Invoice.create([{
    _id: uid("inv"),
    loadId: load._id,
    companyId: load.companyId,
    number: `INV-${27000 + invoiceCount}`,
    status: "SENT",
    issuedAt: now(),
    dueAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    terms: "Net 30",
    billTo: shipper?.name ?? "Shipper",
    remitTo: carrier?.name ?? "Carrier",
    lines,
    subtotal,
    total: subtotal,
    attachedDocIds: load.documents.filter((d: any) => d.type === "BOL" || d.type === "POD").map((d: any) => d.id),
    marginUsd: (load.rates?.customerRateUsd ?? 0) - carrierRate,
  }], { session });

  load.invoiceId = inv[0]._id;
}

/**
 * @swagger
 * /api/loads:
 *   get:
 *     summary: Get all loads
 *     tags: [Loads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *           enum: [DRAFT, DISPATCHED, ASSIGNED, AT_PICKUP, LOADED, IN_TRANSIT, AT_DELIVERY, DELIVERED, INVOICED, PAID, CANCELLED]
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: equipmentType
 *         schema:
 *           type: string
 *           enum: [DRY_VAN_53, REEFER, FLATBED, STEP_DECK, CHASSIS]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: savedView
 *         schema:
 *           type: string
 *           enum: [needs-driver, at-risk, delivered-unbilled, active]
 *     responses:
 *       200:
 *         description: List of loads (filtered by user's company/branch access)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Load'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const getLoads = asyncHandler(async (req: Request, res: Response) => {
  const scope = parseScope(req.query, req.user);
  const query = loadScopeFilter(scope, req.user);
  
  // Apply additional filters from query parameters
  const filter: any = {
    status: req.query.status ? [req.query.status].flat() : undefined,
    equipmentType: req.query.equipmentType,
    search: req.query.search,
    savedView: req.query.savedView,
  };
  
  // Apply status filter if specified
  if (filter.status && filter.status.length > 0) {
    query.status = { $in: filter.status };
  }
  
  // Apply equipment type filter if specified
  if (filter.equipmentType) {
    query.equipmentType = filter.equipmentType;
  }
  
  const loads = await Load.find(query).sort({ createdAt: -1 });
  
  // Apply in-memory filters for complex logic (saved views, search)
  const filteredLoads = loads.filter(load => matchesFilter(load, filter));
  
  const transformed = filteredLoads.map(l => ({ ...l.toObject(), id: l._id }));
  res.json({ success: true, data: transformed });
});

/**
 * @swagger
 * /api/loads/{id}:
 *   get:
 *     summary: Get load by ID
 *     tags: [Loads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Load details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Load'
 *       404:
 *         description: Load not found or access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const getLoad = asyncHandler(async (req: Request, res: Response) => {
  const scope = parseScope(req.query, req.user);
  const query = loadScopeFilter(scope, req.user);
  query._id = req.params.id;
  
  const load = await Load.findOne(query);
  if (!load) {
    res.statusCode = 404;
    throw new Error("Load not found or access denied");
  }
  res.json({ success: true, data: { ...load.toObject(), id: load._id } });
});

/**
 * @swagger
 * /api/loads:
 *   post:
 *     summary: Create new load
 *     tags: [Loads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipperId
 *               - pickup
 *               - delivery
 *               - freight
 *             properties:
 *               shipperId:
 *                 type: string
 *               pickup:
 *                 type: object
 *                 required:
 *                   - facilityName
 *                   - city
 *                   - state
 *                 properties:
 *                   facilityName:
 *                     type: string
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zip:
 *                     type: string
 *                   windowStart:
 *                     type: string
 *                     format: date-time
 *                   windowEnd:
 *                     type: string
 *                     format: date-time
 *               delivery:
 *                 type: object
 *                 required:
 *                   - facilityName
 *                   - city
 *                   - state
 *                 properties:
 *                   facilityName:
 *                     type: string
 *                   address:
 *                     type: string
 *                   city:
 *                     type: string
 *                   state:
 *                     type: string
 *                   zip:
 *                     type: string
 *                   windowStart:
 *                     type: string
 *                     format: date-time
 *                   windowEnd:
 *                     type: string
 *                     format: date-time
 *               freight:
 *                 type: object
 *                 required:
 *                   - commodity
 *                   - weightLb
 *                 properties:
 *                   commodity:
 *                     type: string
 *                   pieces:
 *                     type: number
 *                   weightLb:
 *                     type: number
 *                   palletCount:
 *                     type: number
 *                   hazmat:
 *                     type: boolean
 *                   declaredValueUsd:
 *                     type: number
 *               equipmentType:
 *                 type: string
 *                 enum: [DRY_VAN_53, REEFER, FLATBED, STEP_DECK, CHASSIS]
 *               rates:
 *                 type: object
 *                 properties:
 *                   customerRateUsd:
 *                     type: number
 *                   carrierRateUsd:
 *                     type: number
 *     responses:
 *       201:
 *         description: Load created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Load'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const createLoad = asyncHandler(async (req: Request, res: Response) => {
  const partial = req.body || {};
  
  // Derive companyId from the authenticated user's company
  const companyId = req.user?.companyId;
  if (!companyId) {
    res.statusCode = 400;
    throw new Error("User must belong to a company to create loads");
  }
  
  const session = await Load.startSession();
  session.startTransaction();

  try {
    const count = await Load.countDocuments({ _id: { $regex: /^D2D-248/ } }).session(session);
    const id = `D2D-${24820 + count}`;

    const load = await Load.create([{
      ...partial,
      _id: id,
      companyId,
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
          loadId: id,
          at: now(),
          actor: "Shipper",
          actorRole: "SHIPPER_RECEIVER",
          type: "STATUS_CHANGE",
          description: "Order created",
        },
      ],
    }], { session });

    await session.commitTransaction();

    res.status(201).json({ success: true, data: { ...load[0].toObject(), id: load[0]._id } });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

/**
 * @swagger
 * /api/loads/{id}/advance:
 *   post:
 *     summary: Advance load to next lifecycle step
 *     tags: [Loads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Load advanced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Load'
 *       404:
 *         description: Load not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const advanceLoad = asyncHandler(async (req: Request, res: Response) => {
  const session = await Load.startSession();
  session.startTransaction();

  try {
    const load = await Load.findById(req.params.id).session(session);
    if (!load) {
      res.statusCode = 404;
      throw new Error("Load not found");
    }
    const next = nextStatus(load.status);
    if (!next) return res.json({ success: true, data: load });

    load.status = next;
    load.step = STATUS_STEP[next];
    const stamp = now();

    switch (next) {
      case "AT_PICKUP":
        if (load.pickups && load.pickups.length > 0) {
          (load.pickups[0] as any).actualArrival = stamp;
        }
        break;
      case "LOADED":
        if (load.pickups && load.pickups.length > 0) {
          (load.pickups[0] as any).actualDeparture = stamp;
        }
        signDoc(load, "BOL", "Shipper");
        break;
      case "IN_TRANSIT":
        load.milesRemaining = Math.round((load.milesTotal || 0) * 0.85);
        const firstPickup = load.pickups?.[0];
        const lastDelivery = load.deliveries?.[load.deliveries.length - 1];
        load.currentPosition = {
          lat: firstPickup && lastDelivery ? (firstPickup!.lat! + lastDelivery!.lat!) / 2 : 0,
          lng: firstPickup && lastDelivery ? (firstPickup!.lng! + lastDelivery!.lng!) / 2 : 0,
          updatedAt: stamp,
          speedMph: 62,
        };
        break;
      case "AT_DELIVERY":
        if (load.deliveries && load.deliveries.length > 0) {
          (load.deliveries[load.deliveries.length - 1] as any).actualArrival = stamp;
        }
        load.milesRemaining = 0;
        break;
      case "DELIVERED":
        if (load.deliveries && load.deliveries.length > 0) {
          (load.deliveries[load.deliveries.length - 1] as any).actualDeparture = stamp;
        }
        signDoc(load, "POD", "Receiver");
        // Update driver status when load is delivered
        if (load.driverId) {
          await User.findByIdAndUpdate(
            load.driverId,
            { 
              "driver.status": "AVAILABLE",
              "driver.currentLoadId": undefined,
              $inc: { "driver.loadsCompleted": 1 }
            },
            { session }
          );
        }
        break;
      case "INVOICED":
        await generateInvoice(load, session);
        break;
    }

    pushEvent(load, {
      at: stamp,
      actor: "System",
      actorRole: "SYSTEM",
      type: "STATUS_CHANGE",
      description: `Load moved to ${STATUS_LABEL[next]}`,
    });

    await load.save({ session });
    await session.commitTransaction();

    res.json({ success: true, data: { ...load.toObject(), id: load._id } });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// POST /api/loads/:id/trigger-arrival — simulates the 5-mile geofence alert.
const triggerArrival = asyncHandler(async (req: Request, res: Response) => {
  const load = await Load.findById(req.params.id);
  if (!load) {
    res.statusCode = 404;
    throw new Error("Load not found");
  }
  pushEvent(load, {
    at: now(),
    actor: "System",
    actorRole: "SYSTEM",
    type: "GEOFENCE",
    description: "5-mile arrival alert fired — receiver notified, dock door panel opened",
  });
  await load.save();

  const lastDelivery = load.deliveries?.[load.deliveries.length - 1];
  await Notification.create({
    _id: uid("ntf"),
    loadId: load._id,
    companyId: load.branchId || req.user?.companyId, // Add companyId for proper filtering
    kind: "ARRIVAL_5MI",
    title: `${load.id} — 5 miles from delivery`,
    body: `${lastDelivery?.facilityName || "Delivery facility"}, ${lastDelivery?.city || ""} ${lastDelivery?.state || ""}. Prepare dock door.`,
    at: now(),
    read: false,
    pinned: true,
  });

  res.json({ success: true, data: { ...load.toObject(), id: load._id } });
});

// POST /api/loads/:id/add-delay — simulates a 45-minute detention delay.
const addDelay = asyncHandler(async (req: Request, res: Response) => {
  const load = await Load.findById(req.params.id);
  if (!load) {
    res.statusCode = 404;
    throw new Error("Load not found");
  }
  load.exceptions.push({
    id: uid("exc"),
    loadId: load._id,
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
  await load.save();
  res.json({ success: true, data: { ...load.toObject(), id: load._id } });
});

// POST /api/loads/:id/reset — restores the load back to Draft.
const resetLoad = asyncHandler(async (req: Request, res: Response) => {
  const load = await Load.findById(req.params.id);
  if (!load) {
    res.statusCode = 404;
    throw new Error("Load not found");
  }
  load.status = "DRAFT";
  load.step = 1;
  load.driverId = undefined;
  load.tractorId = undefined;
  load.trailerId = undefined;
  load.invoiceId = undefined;
  (load as any).exceptions = [];
  load.currentPosition = undefined;
  load.onTime = true;
  if (load.pickups) {
    load.pickups.forEach((pickup: any) => {
      pickup.actualArrival = undefined;
      pickup.actualDeparture = undefined;
    });
  }
  if (load.deliveries) {
    load.deliveries.forEach((delivery: any) => {
      delivery.actualArrival = undefined;
      delivery.actualDeparture = undefined;
    });
  }
  (load as any).events = [
    {
      id: uid("evt"),
      loadId: load._id,
      at: now(),
      actor: "System",
      actorRole: "SYSTEM",
      type: "STATUS_CHANGE",
      description: "Load reset to Draft",
    },
  ];
  await load.save();
  res.json({ success: true, data: { ...load.toObject(), id: load._id } });
});

/**
 * @swagger
 * /api/loads/{id}/assign-driver:
 *   post:
 *     summary: Assign driver to load
 *     tags: [Loads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - driverId
 *             properties:
 *               driverId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Driver assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Load'
 *       404:
 *         description: Load or driver not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const assignDriver = asyncHandler(async (req: Request, res: Response) => {
  const { driverId } = req.body;
  const session = await Load.startSession();
  session.startTransaction();

  try {
    const load = await Load.findById(req.params.id).session(session);
    if (!load) {
      res.statusCode = 404;
      throw new Error("Load not found");
    }
    
    const driver = await User.findOne({ _id: driverId, role: "DRIVER" }).session(session);
    if (!driver) {
      res.statusCode = 404;
      throw new Error("Driver not found");
    }

    load.driverId = driverId;
    load.tractorId = driver.driver?.currentTractorId || (await Equipment.findOne({ type: "TRACTOR" }).session(session))?._id;
    load.trailerId = driver.driver?.currentTrailerId || (await Equipment.findOne({ type: "TRAILER" }).session(session))?._id;

    if (load.status === "DRAFT" || load.status === "DISPATCHED") {
      load.status = "ASSIGNED";
      load.step = STATUS_STEP.ASSIGNED;
    }

    // Update driver's current load and status
    if (!driver.driver) {
      driver.driver = {
        phone: "",
        status: "AVAILABLE",
        rating: 5,
        loadsCompleted: 0,
      } as IDriver;
    }
    driver.driver.currentLoadId = load._id;
    driver.driver.status = "ON_LOAD";
    await driver.save({ session });

    pushEvent(load, {
      at: now(),
      actor: "Dispatcher",
      actorRole: "CARRIER_BRANCH",
      type: "ASSIGNMENT",
      description: `${driver.name} assigned to load`,
    });

    await load.save({ session });
    
    // Create notification for driver assignment
    await Notification.create([{
      _id: uid("ntf"),
      loadId: load._id,
      companyId: req.user?.companyId,
      userId: driverId,
      kind: "ASSIGNMENT",
      title: "New load assigned",
      body: `Load ${load._id} has been assigned to you`,
      at: now(),
      read: false,
      pinned: false,
    }], { session });
    
    await session.commitTransaction();

    res.json({ success: true, data: { ...load.toObject(), id: load._id } });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

/**
 * @swagger
 * /api/loads/{id}:
 *   patch:
 *     summary: Update load details
 *     tags: [Loads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               carrier:
 *                 type: object
 *                 properties:
 *                   carrierId:
 *                     type: string
 *                   branchId:
 *                     type: string
 *               equipmentType:
 *                 type: string
 *                 enum: [DRY_VAN_53, REEFER, FLATBED, STEP_DECK, CHASSIS]
 *               rates:
 *                 type: object
 *                 properties:
 *                   customerRateUsd:
 *                     type: number
 *                   carrierRateUsd:
 *                     type: number
 *     responses:
 *       200:
 *         description: Load updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Load'
 *       404:
 *         description: Load not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const updateLoad = asyncHandler(async (req: Request, res: Response) => {
  const load = await Load.findById(req.params.id);
  if (!load) {
    res.statusCode = 404;
    throw new Error("Load not found");
  }

  // Update allowed fields
  const allowedUpdates = ["carrier"];
  const updates: any = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  Object.assign(load, updates);
  await load.save();
  res.json({ success: true, data: { ...load.toObject(), id: load._id } });
});

export {
  getLoads,
  getLoad,
  createLoad,
  advanceLoad,
  triggerArrival,
  addDelay,
  resetLoad,
  assignDriver,
  updateLoad,
};
