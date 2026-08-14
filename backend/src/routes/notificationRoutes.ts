import express from "express";
import { getNotifications } from "../controllers/notificationController";

const router = express.Router();

router.get("/", getNotifications);

export default router;
