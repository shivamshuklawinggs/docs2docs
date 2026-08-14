import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import Branch from "../models/Branch";
import Company from "../models/Company";
import { parseScope, scopeFilter } from "../utils/applyScope";
import { uid } from "../utils/ids";

/**
 * @swagger
 * /api/branches:
 *   get:
 *     summary: Get all branches
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *         description: Filter branches by company ID (SUPER_ADMIN can use "ALL" to view all branches or specific ID to filter)
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by specific branch ID
 *     responses:
 *       200:
 *         description: List of branches
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
 *                     $ref: '#/components/schemas/Branch'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /api/branches?companyId=&branchId=
const getBranches = asyncHandler(async (req: Request, res: Response) => {
  const scope = parseScope(req.query, req.user);
  let query: any = {};
  
  // SUPER_ADMIN can view all branches or filter by specific company
  if (req.user?.role === "SUPER_ADMIN") {
    // If companyId is "ALL" or not provided, show all branches
    // If companyId is a specific ID, filter by that company
    if (req.query.companyId && req.query.companyId !== "ALL") {
      query.companyId = req.query.companyId;
    }
    // Otherwise, no filtering - show all branches
  } else {
    // For other users, apply scope filtering
    query = scopeFilter(scope, req.user);
  }
  
  const branches = await Branch.find(query).sort({ name: 1 });
  const transformed = branches.map(b => ({ ...b.toObject(), id: b._id }));
  res.json({ success: true, data: transformed });
});

/**
 * @swagger
 * /api/branches/{id}:
 *   get:
 *     summary: Get branch by ID
 *     tags: [Branches]
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
 *         description: Branch details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Branch'
 *       404:
 *         description: Branch not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const getBranch = asyncHandler(async (req: Request, res: Response) => {
  let query: any = { _id: req.params.id };
  
  // SUPER_ADMIN can view any branch
  if (req.user?.role !== "SUPER_ADMIN") {
    // For other users, apply scope filtering
    const scope = parseScope({}, req.user);
    const scopeQuery = scopeFilter(scope, req.user);
    query = { ...query, ...scopeQuery };
  }
  
  const branch = await Branch.findOne(query);
  if (!branch) {
    res.statusCode = 404;
    throw new Error("Branch not found or access denied");
  }
  res.json({ success: true, data: { ...branch.toObject(), id: branch._id } });
});

/**
 * @swagger
 * /api/branches:
 *   post:
 *     summary: Create new branch
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - name
 *               - city
 *               - state
 *               - level
 *             properties:
 *               companyId:
 *                 type: string
 *               name:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               level:
 *                 type: string
 *                 enum: [CORPORATE, SATELLITE]
 *               managerId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Branch created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Branch'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /api/branches — with transaction support and company linking
const createBranch = asyncHandler(async (req: Request, res: Response) => {
  const { companyId, name, city, state, level, managerId } = req.body;
  if (!companyId || !name || !city || !state || !level) {
    res.statusCode = 400;
    throw new Error("Missing required fields: companyId, name, city, state, level");
  }

  const session = await Branch.startSession();
  session.startTransaction();

  try {
    const branchId = uid("br");

    const branch = await Branch.create([{
      _id: branchId,
      companyId,
      name,
      city,
      state,
      level,
      managerId: managerId || "",
    }], { session });

    // Link branch to company
    await Company.findByIdAndUpdate(
      companyId,
      { $push: { branches: branchId } },
      { session }
    );

    await session.commitTransaction();

    res.json({ success: true, data: { ...branch[0].toObject(), id: branch[0]._id } });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export { getBranches, getBranch, createBranch };
