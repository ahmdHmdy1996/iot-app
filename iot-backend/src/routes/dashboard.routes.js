import express from "express";
import {
  authMiddleware,
  authorizeRole,
} from "../middlewares/auth.middleware.js";
import * as readingController from "../controllers/reading.controller.js";
import * as alertController from "../controllers/alert.controller.js";

const router = express.Router();

// Protect all routes: JWT auth + CLIENT/ADMIN role
router.use(authMiddleware);
router.use(authorizeRole(["CLIENT", "ADMIN"]));

// GET /api/devices/:imei/dashboard
router.get("/:imei/dashboard", readingController.getDashboard);

// GET /api/devices/:imei/stats
router.get("/:imei/stats", readingController.getStats);

export default router;
