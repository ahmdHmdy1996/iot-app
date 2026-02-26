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

// GET /api/audit-report/:imei?from=&to=
router.get("/:imei", alertController.getAuditReport);

export default router;
