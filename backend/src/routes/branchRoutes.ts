import express from "express";
import { getBranches, getBranch, createBranch } from "../controllers/branchController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/", protect, getBranches);
router.get("/:id", protect, getBranch);
router.post("/", protect, createBranch);

export default router;
