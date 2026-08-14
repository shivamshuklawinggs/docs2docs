import express from "express";
import {
  getLoads,
  getLoad,
  createLoad,
  advanceLoad,
  triggerArrival,
  addDelay,
  resetLoad,
  assignDriver,
  updateLoad,
} from "../controllers/loadController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/", protect, getLoads);
router.post("/", protect, createLoad);
router.get("/:id", protect, getLoad);
router.post("/:id/advance", protect, advanceLoad);
router.post("/:id/trigger-arrival", protect, triggerArrival);
router.post("/:id/add-delay", protect, addDelay);
router.post("/:id/reset", protect, resetLoad);
router.post("/:id/assign-driver", protect, assignDriver);
router.patch("/:id", protect, updateLoad);

export default router;
