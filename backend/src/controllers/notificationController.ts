import { Request, Response } from "express";
import asyncHandler from "../middleware/asyncHandler";
import Notification from "../models/Notification";

// GET /api/notifications
const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  let query: any = {};
  
  // For SUPER_ADMIN, show all notifications
  if (req.user?.role === "SUPER_ADMIN") {
    // No filtering needed
  } else {
    // For other users, only show notifications for their company
    query.companyId = req.user?.companyId;
    
    // For drivers, also show their personal notifications
    if (req.user?.role === "DRIVER") {
      query.$or = [
        { companyId: req?.user?.companyId },
        { userId: req?.user?._id.toString() },
      ];
    }
  }
  
  const notifications = await Notification.find(query).sort({ createdAt: -1 });
  res.json({ success: true, data: notifications });
});

export { getNotifications };
