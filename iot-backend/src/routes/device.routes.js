import express from "express";
import {
  hybridAuthMiddleware,
  systemAuthMiddleware,
} from "../middlewares/systemAuth.middleware.js";
import { authorizeRole } from "../middlewares/auth.middleware.js";
import * as deviceController from "../controllers/device.controller.js";

const router = express.Router();

// Hybrid Auth: allow either User JWT OR System API Key
router.use(hybridAuthMiddleware);

// If it's a normal user (not system auth), enforce CLIENT/ADMIN roles
router.use((req, res, next) => {
  if (req.isSystemAuth) return next();
  return authorizeRole(["CLIENT", "ADMIN"])(req, res, next);
});

// POST /api/my-devices/add (must be before /:imei to avoid conflict)
router.post("/add", deviceController.addUserDevice);

// GET /api/my-devices
router.get("/", deviceController.getUserDevices);

// PATCH & DELETE /api/my-devices/:imei
router.patch("/:imei", deviceController.updateUserDevice);
router.delete("/:imei", deviceController.deleteUserDevice);

export default router;
