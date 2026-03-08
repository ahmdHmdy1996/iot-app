import express from "express";
import {
  authMiddleware,
  authorizeRole,
} from "../middlewares/auth.middleware.js";
import * as alertController from "../controllers/alert.controller.js";

const router = express.Router();

// Protect all routes: JWT auth + CLIENT/ADMIN role
router.use(authMiddleware);
router.use(authorizeRole(["CLIENT", "ADMIN"]));

// GET /api/alerts/:imei
router.get("/:imei", alertController.getAlerts);

// DELETE /api/alerts/:imei  – clear all alerts for a device
router.delete("/:imei", alertController.clearAlerts);

export default router;
