import express from "express";
import authRoutes from "./authRoutes";
import companyRoutes from "./companyRoutes";
import branchRoutes from "./branchRoutes";
import userRoutes from "./userRoutes";
import driverRoutes from "./driverRoutes";
import equipmentRoutes from "./equipmentRoutes";
import invoiceRoutes from "./invoiceRoutes";
import reviewRoutes from "./reviewRoutes";
import notificationRoutes from "./notificationRoutes";
import loadRoutes from "./loadRoutes";
import { getDataByUSDOT } from "../controllers/saferapi.controller";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/companies", companyRoutes);
router.use("/branches", branchRoutes);
router.use("/users", userRoutes);
router.use("/drivers", driverRoutes);
router.use("/equipment", equipmentRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/reviews", reviewRoutes);
router.use("/notifications", notificationRoutes);
router.use("/loads", loadRoutes);
router.get("/usdot/:usdotnumber", getDataByUSDOT);

export default router;
