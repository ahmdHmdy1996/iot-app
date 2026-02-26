import express from "express";
import {
  authMiddleware,
  authorizeRole,
} from "../middlewares/auth.middleware.js";
import * as deviceController from "../controllers/device.controller.js";

const router = express.Router();

// Protect all routes: JWT auth + CLIENT/ADMIN role
router.use(authMiddleware);
router.use(authorizeRole(["CLIENT", "ADMIN"]));

// POST /api/my-devices/add (must be before /:imei to avoid conflict)
router.post("/add", deviceController.addUserDevice);

// GET /api/my-devices
router.get("/", deviceController.getUserDevices);

// PATCH & DELETE /api/my-devices/:imei
router.patch("/:imei", deviceController.updateUserDevice);
router.delete("/:imei", deviceController.deleteUserDevice);

export default router;
