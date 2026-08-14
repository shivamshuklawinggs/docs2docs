import express from "express";
import { getDrivers, getDriver, createDriver } from "../controllers/driverController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/", protect, getDrivers);
router.get("/:id", protect, getDriver);
router.post("/", protect, createDriver);

export default router;
