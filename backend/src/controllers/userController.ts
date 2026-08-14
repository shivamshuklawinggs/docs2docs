import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import User from "../models/User";
import Company from "../models/Company";
import { parseScope, scopeFilter } from "../utils/applyScope";
import { uid, now } from "../utils/ids";

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
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
 *     responses:
 *       200:
 *         description: List of users
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
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const scope = parseScope(req.query, req.user);
  const query = scopeFilter(scope, req.user);
  if(req.user?.role=="SUPER_ADMIN"){
    query.role={
      $nin:[
        "DRIVER",
        "SUPER_ADMIN"
      ]
    }
  }
  const users = await User.find(query).sort({ name: 1 });
  const transformed = users.map(u => ({ ...u.toObject(), id: u._id }));
  res.json({ success: true, data: transformed });
});

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
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
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const getUser = asyncHandler(async (req: Request, res: Response) => {
  const scope = parseScope({}, req.user);
  const query = scopeFilter(scope, req.user);
  query._id = req.params.id; // Add specific user ID to query
  
  const user = await User.findOne(query);
  if (!user) {
    res.statusCode = 404;
    throw new Error("User not found or access denied");
  }
  res.json({ success: true, data: { ...user.toObject(), id: user._id } });
});

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create new user
 *     tags: [Users]
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
 *               - password
 *               - role
 *               - companyId
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [SUPER_ADMIN, CARRIER_CORP, CARRIER_BRANCH, BROKER_CORP, BROKER_BRANCH, SHIPPER_RECEIVER, DRIVER]
 *               companyId:
 *                 type: string
 *               branchIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, companyId, branchIds, permissions } = req.body;
  if (!name || !email || !password || !role || !companyId) {
    res.statusCode = 400;
    throw new Error("Missing required fields: name, email, password, role, companyId");
  }

  const session = await User.startSession();
  session.startTransaction();

  try {
    const existing = await User.findOne({ email: email.trim().toLowerCase() }).session(session);
    if (existing) {
      res.statusCode = 409;
      throw new Error("An account with this email already exists");
    }

    const userId = uid("usr");

    const user = await User.create([{
      _id: userId,
      name,
      email: email.trim().toLowerCase(),
      password,
      role,
      companyId,
      branchIds: branchIds || ["ALL"],
      permissions: permissions || [],
      lastActive: now(),
    }], { session });

    // Link user to company
    await Company.findByIdAndUpdate(
      companyId,
      { $push: { userIds: userId } },
      { session }
    );

    await session.commitTransaction();

    const safeUser: any = user[0].toObject();
    delete safeUser.password;

    res.status(201).json({ success: true, data: { ...safeUser, id: user[0]._id } });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export { getUsers, getUser, createUser };
