import express from "express";
import { getEquipment, getEquipmentById, createEquipment } from "../controllers/equipmentController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/", protect, getEquipment);
router.get("/:id", protect, getEquipmentById);
router.post("/", protect, createEquipment);

export default router;
