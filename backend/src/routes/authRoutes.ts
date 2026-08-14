import express from "express";
import { login, me, register, forgotPassword, resetPassword, sendOTP, verifyOTP, changePassword } from "../controllers/authController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", protect, me);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/change-password", protect, changePassword);

export default router;
