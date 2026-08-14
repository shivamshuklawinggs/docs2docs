import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from 'express';
import User, { IUser } from "../models/User";
import asyncHandler from "./asyncHandler";

// Extend Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}

// Verifies the Bearer token and attaches req?.user?. Use on protected routes.
const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.statusCode = 401;
    throw new Error("Not authorized — token missing");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      res.statusCode = 401;
      throw new Error("Not authorized — user no longer exists");
    }
    req.user = user;
    next();
  } catch (err) {
    res.statusCode = 401;
    throw new Error("Not authorized — invalid token");
  }
});

// Optional auth: attaches req.user if a valid token is present, otherwise continues.
const optionalAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await User.findById(decoded.id).select("-password");
    if (user) req.user = user;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
});

// Restricts to a set of roles. Must run after `protect`.
const requireRole =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req?.user?.role)) {
      res.statusCode = 403;
      throw new Error("Forbidden — insufficient role");
    }
    next();
  };

// Allow drivers to access their own data
const requireDriverOrCompany = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.statusCode = 401;
    throw new Error("Not authorized");
  }
  
  // Allow non-driver roles to proceed
  if (req?.user?.role !== "DRIVER") {
    return next();
  }
  
  // For drivers, ensure they can only access their own data
  const resourceUserId = req.params.id || req.body.driverId;
  if (resourceUserId && resourceUserId !== req?.user?._id.toString()) {
    res.statusCode = 403;
    throw new Error("Forbidden — drivers can only access their own data");
  }
  
  next();
});

export { protect, optionalAuth, requireRole, requireDriverOrCompany };
