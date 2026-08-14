import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import Company from "../models/Company";

/**
 * @swagger
 * /api/companies:
 *   get:
 *     summary: Get all companies
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by company name, DOT number, or MC number
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [CARRIER, BROKER, SHIPPER_RECEIVER]
 *         description: Filter by company type
 *     responses:
 *       200:
 *         description: List of companies (SUPER_ADMIN sees all, others see only their own)
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
 *                     $ref: '#/components/schemas/Company'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const getCompanies = asyncHandler(async (req: Request, res: Response) => {
  let query: any = {};
  
  // Non-SUPER_ADMIN users can only see their own company
  if (req.user?.role !== "SUPER_ADMIN") {
     query._id = req?.user?.companyId;
  }
  
  // Search filter
  if (req.query.search) {
    const search = req.query.search as string;
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { dotNumber: { $regex: search, $options: 'i' } },
      { mcNumbers: { $in: [new RegExp(search, 'i')] } },
    ];
  }
  
  // Type filter
  if (req.query.type) {
    query.type = req.query.type;
    if(req.query.type==="CARRIER"){
     delete query._id
    }
  }
  console.log("query",query)
  const companies = await Company.find(query).sort({ createdAt: -1 });
  const transformed = companies.map(c => ({ ...c.toObject(), id: c._id }));
  res.json({ success: true, data: transformed });
});

/**
 * @swagger
 * /api/companies/{id}:
 *   get:
 *     summary: Get company by ID
 *     tags: [Companies]
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
 *         description: Company details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       403:
 *         description: Access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Company not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const getCompany = asyncHandler(async (req: Request, res: Response) => {
  let query: any = { _id: req.params.id };
  
  // Non-SUPER_ADMIN users can only see their own company
  if (req.user?.role !== "SUPER_ADMIN" && req.params.id !== req?.user?.companyId) {
    res.statusCode = 403;
    throw new Error("Access denied — can only view your own company");
  }
  
  const company = await Company.findOne(query);
  if (!company) {
    res.statusCode = 404;
    throw new Error("Company not found");
  }
  res.json({ success: true, data: { ...company.toObject(), id: company._id } });
});

/**
 * @swagger
 * /api/companies/{id}/approve:
 *   post:
 *     summary: Approve a pending company (SUPER_ADMIN only)
 *     tags: [Companies]
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
 *         description: Company approved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       403:
 *         description: Access denied (SUPER_ADMIN only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Company not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const approveCompany = asyncHandler(async (req: Request, res: Response) => {
  // Only SUPER_ADMIN can approve companies
  if (req.user?.role !== "SUPER_ADMIN") {
    res.statusCode = 403;
    throw new Error("Access denied — only SUPER_ADMIN can approve companies");
  }
  
  const company = await Company.findById(req.params.id);
  if (!company) {
    res.statusCode = 404;
    throw new Error("Company not found");
  }
  company.status = "ACTIVE";
  await company.save();
  res.json({ success: true, data: { ...company.toObject(), id: company._id } });
});

/**
 * @swagger
 * /api/companies/{id}/decline:
 *   post:
 *     summary: Decline a pending company (SUPER_ADMIN only)
 *     tags: [Companies]
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
 *         description: Company declined successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       403:
 *         description: Access denied (SUPER_ADMIN only)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Company not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const declineCompany = asyncHandler(async (req: Request, res: Response) => {
  // Only SUPER_ADMIN can decline companies
  if (req.user?.role !== "SUPER_ADMIN") {
    res.statusCode = 403;
    throw new Error("Access denied — only SUPER_ADMIN can decline companies");
  }
  
  const company = await Company.findById(req.params.id);
  if (!company) {
    res.statusCode = 404;
    throw new Error("Company not found");
  }
  company.status = "DECLINED";
  await company.save();
  res.json({ success: true, data: { ...company.toObject(), id: company._id } });
});

/**
 * @swagger
 * /api/companies/{id}:
 *   patch:
 *     summary: Update company details
 *     tags: [Companies]
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
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [CARRIER, BROKER, SHIPPER_RECEIVER]
 *               plan:
 *                 type: string
 *                 enum: [STARTER, GROWTH, ENTERPRISE]
 *               status:
 *                 type: string
 *                 enum: [PENDING, ACTIVE, SUSPENDED, TRIAL, DECLINED]
 *               dotNumber:
 *                 type: string
 *               mcNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Company'
 *       403:
 *         description: Access denied or cannot change protected fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Company not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const updateCompany = asyncHandler(async (req: Request, res: Response) => {
  // Users can only update their own company (except SUPER_ADMIN)
  if (req.user?.role !== "SUPER_ADMIN" && req.params.id !== req?.user?.companyId) {
    res.statusCode = 403;
    throw new Error("Access denied — can only update your own company");
  }
  
  const { name, type, plan, status, dotNumber, mcNumber } = req.body;
  const company = await Company.findById(req.params.id);
  if (!company) {
    res.statusCode = 404;
    throw new Error("Company not found");
  }
  
  // Non-SUPER_ADMIN users cannot change certain fields
  if (req.user?.role !== "SUPER_ADMIN") {
    if (type !== undefined || status !== undefined) {
      res.statusCode = 403;
      throw new Error("Access denied — cannot change company type or status");
    }
  }
  
  if (name !== undefined) company.name = name;
  if (type !== undefined) company.type = type;
  if (plan !== undefined) company.plan = plan;
  if (status !== undefined) company.status = status;
  if (dotNumber !== undefined) company.dotNumber = dotNumber;
  if (mcNumber !== undefined) company.mcNumbers = mcNumber ? [mcNumber] : company.mcNumbers;
  await company.save();
  res.json({ success: true, data: { ...company.toObject(), id: company._id } });
});

export { getCompanies, getCompany, approveCompany, declineCompany, updateCompany };
