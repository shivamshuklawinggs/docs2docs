import express from "express";
import { getUsers, getUser, createUser } from "../controllers/userController";
import { protect } from "../middleware/auth";

const router = express.Router();

router.get("/", protect, getUsers);
router.get("/:id", protect, getUser);
router.post("/", protect, createUser);

export default router;
