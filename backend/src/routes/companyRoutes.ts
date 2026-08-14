import express from "express";
import {
  getCompanies,
  getCompany,
  approveCompany,
  declineCompany,
  updateCompany,
} from "../controllers/companyController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/", protect, getCompanies);
router.get("/:id", protect, getCompany);
router.post("/:id/approve", protect, approveCompany);
router.post("/:id/decline", protect, declineCompany);
router.patch("/:id", protect, updateCompany);

export default router;
