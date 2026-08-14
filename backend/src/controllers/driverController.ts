import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import User from "../models/User";
import Company from "../models/Company";
import { scopeFilter, parseScope } from "../utils/applyScope";
import { uid, now } from "../utils/ids";

/**
 * @swagger
 * /api/drivers:
 *   get:
 *     summary: Get all drivers
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [AVAILABLE, ON_LOAD, OFF_DUTY, INACTIVE]
 *     responses:
 *       200:
 *         description: List of drivers (filtered by user's company/branch access)
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
 *                     $ref: '#/components/schemas/Driver'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const getDrivers = asyncHandler(async (req: Request, res: Response) => {
  const scope = parseScope(req.query, req.user);
  const baseFilter = scopeFilter(scope, req.user);
  
  // Query users with DRIVER role and apply scope filter
  const query: any = { role: "DRIVER", ...baseFilter };
  
  // For drivers, they can only see themselves
  if (req.user?.role === "DRIVER") {
    query._id = req?.user?._id;
  }
  
  const drivers = await User.find(query).sort({ name: 1 });
  const transformed = drivers.map(d => ({ ...d.toObject(), id: d._id }));
  res.json({ success: true, data: transformed });
});

/**
 * @swagger
 * /api/drivers/{id}:
 *   get:
 *     summary: Get driver by ID
 *     tags: [Drivers]
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
 *         description: Driver details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Driver'
 *       403:
 *         description: Access denied (drivers can only view their own profile)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Driver not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const getDriver = asyncHandler(async (req: Request, res: Response) => {
  const scope = parseScope({}, req.user);
  const baseFilter = scopeFilter(scope, req.user);
  
  // Add specific driver ID and role filter
  const query: any = { 
    _id: req.params.id, 
    role: "DRIVER",
    ...baseFilter 
  };
  
  // For drivers, they can only see themselves
  if (req.user?.role === "DRIVER" && req.params.id !== req?.user?._id.toString()) {
    res.statusCode = 403;
    throw new Error("Access denied — can only view your own profile");
  }
  
  const driver = await User.findOne(query);
  if (!driver) {
    res.statusCode = 404;
    throw new Error("Driver not found or access denied");
  }
  res.json({ success: true, data: { ...driver.toObject(), id: driver._id } });
});

/**
 * @swagger
 * /api/drivers:
 *   post:
 *     summary: Create new driver
 *     tags: [Drivers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *               - companyId
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *                 description: Required for drivers, must be unique
 *               password:
 *                 type: string
 *                 format: password
 *               companyId:
 *                 type: string
 *               carrierId:
 *                 type: string
 *                 description: Carrier ID (defaults to companyId if not provided)
 *               branchId:
 *                 type: string
 *               licenses:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     state:
 *                       type: string
 *                     number:
 *                       type: string
 *                     class:
 *                       type: string
 *                     expiry:
 *                       type: string
 *               medicalCertExpiry:
 *                 type: string
 *                 format: date
 *               emergencyContacts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     phone:
 *                       type: string
 *     responses:
 *       201:
 *         description: Driver created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Driver'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email or phone number already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const createDriver = asyncHandler(async (req: Request, res: Response) => {
  const { 
    name, 
    email, 
    phone, 
    password, 
    companyId, 
    carrierId, 
    branchId,
    licenses,
    medicalCertExpiry,
    emergencyContacts
  } = req.body;
  
  if (!name || !email || !phone || !password || !companyId) {
    res.statusCode = 400;
    throw new Error("Missing required fields: name, email, phone, password, companyId");
  }

  const session = await User.startSession();
  session.startTransaction();

  try {
    const existing = await User.findOne({ email: email.trim().toLowerCase() }).session(session);
    if (existing) {
      res.statusCode = 409;
      throw new Error("An account with this email already exists");
    }

    // Check if phone number is already in use
    const existingPhone = await User.findOne({ "driver.phone": phone.trim() }).session(session);
    if (existingPhone) {
      res.statusCode = 409;
      throw new Error("An account with this phone number already exists");
    }

    const driverId = uid("drv");

    const driver = await User.create([{
      _id: driverId,
      name,
      email: email.trim().toLowerCase(),
      password,
      role: "DRIVER",
      companyId,
      branchIds: [branchId || "ALL"],
      permissions: [],
      lastActive: now(),
      driver: {
        phone: phone.trim(),
        carrierId: carrierId || companyId, // If no specific carrierId, use companyId
        status: "AVAILABLE",
        licenses: licenses || [],
        medicalCertExpiry: medicalCertExpiry || undefined,
        emergencyContacts: emergencyContacts || [],
        rating: 5,
        loadsCompleted: 0,
      },
    }], { session });

    // Link driver to company
    await Company.findByIdAndUpdate(
      companyId,
      { $push: { userIds: driverId } },
      { session }
    );

    await session.commitTransaction();

    const safeDriver: any = driver[0].toObject();
    delete safeDriver.password;

    res.status(201).json({ success: true, data: { ...safeDriver, id: driver[0]._id } });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export { getDrivers, getDriver, createDriver };
