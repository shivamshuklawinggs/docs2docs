import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import User from "../models/User";
import Company from "../models/Company";
import Branch from "../models/Branch";
import generateToken from "../utils/generateToken";
import { isCorporate } from "../utils/rbac";
import { uid, now } from "../utils/ids";

// Build the client-facing scope object from a user + selected branch.
function scopeFor(user: any, branchId: string) {
  const effective = isCorporate(user.role) ? branchId : user.branchIds[0] || "ALL";
  return { companyId: user.companyId, branchId: effective, role: user.role };
}

// Simple in-memory OTP storage (in production, use Redis or database)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via SMS (mock implementation - in production, use SMS service like Twilio)
function sendOTPSMS(phone: string, otp: string): void {
  console.log(`[SMS Mock] OTP for ${phone}: ${otp}`);
  // In production, integrate with SMS service like Twilio, AWS SNS, etc.
}

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 scope:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.statusCode = 400;
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
  if (!user) {
    res.statusCode = 401;
    throw new Error("Invalid email or password");
  }

  const match = await user.comparePassword(password);
  if (!match) {
    res.statusCode = 401;
    throw new Error("Invalid email or password");
  }

  const company = await Company.findById(user.companyId);
  const approved =
    user.role === "SUPER_ADMIN" || company?.status === "ACTIVE" || company?.status === "TRIAL";
  if (!approved) {
    res.statusCode = 403;
    throw new Error("Your company account is pending approval or has been suspended");
  }

  const branchId = isCorporate(user.role) ? "ALL" : user.branchIds[0] || "ALL";
  const token = generateToken({ _id: user._id.toString(), role: user.role, companyId: user.companyId });
  const safeUser: any = user.toObject();
  delete safeUser.password;

  res.json({
    success: true,
    token,
    user: safeUser,
    scope: scopeFor(user, branchId),
  });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, user: req.user });
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new company and admin user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - type
 *               - adminName
 *               - adminEmail
 *               - adminPassword
 *             properties:
 *               companyName:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [CARRIER, BROKER, SHIPPER_RECEIVER]
 *               plan:
 *                 type: string
 *                 enum: [STARTER, GROWTH, ENTERPRISE]
 *                 default: STARTER
 *               branchCity:
 *                 type: string
 *               branchState:
 *                 type: string
 *               branchAddress:
 *                 type: string
 *               adminName:
 *                 type: string
 *               adminEmail:
 *                 type: string
 *                 format: email
 *               adminPassword:
 *                 type: string
 *                 format: password
 *               dotNumber:
 *                 type: string
 *               mcNumber:
 *                 type: string
 *               phone:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [PENDING, ACTIVE, TRIAL]
 *                 default: PENDING
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 company:
 *                   $ref: '#/components/schemas/Company'
 *                 admin:
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
const register = asyncHandler(async (req: Request, res: Response) => {
  const {
    companyName,
    type,
    plan = "STARTER",
    branchCity,
    branchState,
    branchAddress,
    adminName,
    adminEmail,
    adminPassword,
    dotNumber,
    mcNumber,
    phone,
    status = "PENDING",
  } = req.body;

  if (!companyName || !type || !adminName || !adminEmail || !adminPassword) {
    res.statusCode = 400;
    throw new Error("Missing required registration fields");
  }

  const session = await User.startSession();
  session.startTransaction();

  try {
    const existing = await User.findOne({ email: adminEmail.trim().toLowerCase() }).session(session);
    if (existing) {
      res.statusCode = 409;
      throw new Error("An account with this email already exists");
    }

    const companyId = uid("co");
    const branchId = uid("br");
    const adminId = uid("usr");

    const branch = await Branch.create([{
      _id: branchId,
      companyId,
      name: `${companyName} — Corporate`,
      address: branchAddress || "",
      city: branchCity,
      state: branchState,
      level: "CORPORATE",
      managerId: adminId,
    }], { session });

    const roleMap: Record<string, string> = {
      CARRIER: "CARRIER_CORP",
      BROKER: "BROKER_CORP",
      SHIPPER_RECEIVER: "SHIPPER_RECEIVER",
    };

    const company = await Company.create([{
      _id: companyId,
      name: companyName,
      type,
      dotNumber: dotNumber || (type === "CARRIER" ? String(Math.floor(Math.random() * 3000000) + 1000000) : undefined),
      mcNumbers: mcNumber ? [mcNumber] : type !== "SHIPPER_RECEIVER" ? [`MC-${Math.floor(Math.random() * 900000) + 100000}`] : undefined,
      branches: [branchId],
      userIds: [adminId], // Link the admin user to the company
      plan,
      rating: 4.5,
      mrrUsd: plan === "STARTER" ? 1200 : plan === "GROWTH" ? 3500 : 9800,
      status,
    }], { session });

    const admin = await User.create([{
      _id: adminId,
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: roleMap[type],
      companyId,
      branchIds: ["ALL"],
      permissions: [],
      lastActive: now(),
    }], { session });

    await session.commitTransaction();

    const safeAdmin: any = admin[0].toObject();
    delete safeAdmin.password;

    res.status(201).json({ success: true, company: company[0], admin: safeAdmin });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    res.statusCode = 400;
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    res.statusCode = 404;
    throw new Error("No account found with this email");
  }

  // Generate reset token (in production, use a proper token with expiry)
  const resetToken = uid("reset");
  const resetExpires = Date.now() + 3600000; // 1 hour

  // Store reset token (in production, save to database)
  otpStore.set(email, { otp: resetToken, expiresAt: resetExpires });

  // Send reset email (mock implementation)
  console.log(`[Email Mock] Password reset for ${email}: ${resetToken}`);
  // In production, send email with reset link containing the token

  res.json({ 
    success: true, 
    message: "Password reset email sent. Check your inbox for instructions." 
  });
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - token
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    res.statusCode = 400;
    throw new Error("Email, token, and new password are required");
  }

  if (newPassword.length < 6) {
    res.statusCode = 400;
    throw new Error("Password must be at least 6 characters");
  }

  const stored = otpStore.get(email);
  if (!stored || stored.otp !== token || Date.now() > stored.expiresAt) {
    res.statusCode = 400;
    throw new Error("Invalid or expired reset token");
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    res.statusCode = 404;
    throw new Error("User not found");
  }

  user.password = newPassword;
  await user.save();

  // Clear the used token
  otpStore.delete(email);

  res.json({ 
    success: true, 
    message: "Password reset successful. You can now login with your new password." 
  });
});

/**
 * @swagger
 * /api/auth/send-otp:
 *   post:
 *     summary: Send OTP for phone login (drivers only)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Phone number with country code
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 expiresAt:
 *                   type: number
 *       404:
 *         description: Driver not found with this phone number
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const sendOTPController = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    res.statusCode = 400;
    throw new Error("Phone number is required");
  }

  const user = await User.findOne({ "driver.phone": phone.trim(), role: "DRIVER" });
  if (!user) {
    res.statusCode = 404;
    throw new Error("No driver account found with this phone number");
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + 300000; // 5 minutes

  // Store OTP
  otpStore.set(phone, { otp, expiresAt });

  // Send OTP via SMS
  sendOTPSMS(phone, otp);

  res.json({ 
    success: true, 
    message: "OTP sent to your phone number",
    expiresAt
  });
});

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and login with phone number
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - otp
 *             properties:
 *               phone:
 *                 type: string
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 scope:
 *                   type: object
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) {
    res.statusCode = 400;
    throw new Error("Phone number and OTP are required");
  }

  const stored = otpStore.get(phone);
  if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
    res.statusCode = 400;
    throw new Error("Invalid or expired OTP");
  }

  const user = await User.findOne({ "driver.phone": phone.trim(), role: "DRIVER" });
  if (!user) {
    res.statusCode = 404;
    throw new Error("Driver not found");
  }

  const company = await Company.findById(user.companyId);
  const approved =
    user.role === "SUPER_ADMIN" || company?.status === "ACTIVE" || company?.status === "TRIAL";
  if (!approved) {
    res.statusCode = 403;
    throw new Error("Your company account is pending approval or has been suspended");
  }

  const branchId = isCorporate(user.role) ? "ALL" : user.branchIds[0] || "ALL";
  const token = generateToken({ _id: user._id.toString(), role: user.role, companyId: user.companyId });
  const safeUser: any = user.toObject();
  delete safeUser.password;

  // Clear the used OTP
  otpStore.delete(phone);

  res.json({
    success: true,
    token,
    user: safeUser,
    scope: scopeFor(user, branchId),
  });
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password (authenticated)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid current password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.statusCode = 400;
    throw new Error("Current password and new password are required");
  }

  if (newPassword.length < 6) {
    res.statusCode = 400;
    throw new Error("New password must be at least 6 characters");
  }

  const user = await User.findById(req?.user?._id).select("+password");
  if (!user) {
    res.statusCode = 404;
    throw new Error("User not found");
  }

  const match = await user.comparePassword(currentPassword);
  if (!match) {
    res.statusCode = 400;
    throw new Error("Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  res.json({ 
    success: true, 
    message: "Password changed successfully" 
  });
});

export { login, me, register, forgotPassword, resetPassword, sendOTPController as sendOTP, verifyOTP, changePassword };
