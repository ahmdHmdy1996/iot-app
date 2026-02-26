import express from "express";
import {
  authMiddleware,
  superAdminOnly,
} from "../middlewares/auth.middleware.js";
import * as superAdminController from "../controllers/superAdmin.controller.js";
import * as apiKeyController from "../controllers/apiKey.controller.js";

const router = express.Router();

// Protect all routes: JWT auth + Super Admin only
router.use(authMiddleware);
router.use(superAdminOnly);

// Users
router.get("/users", superAdminController.getUsers);
router.post("/users", superAdminController.createUser);
router.patch("/users/:id", superAdminController.updateUser);
router.delete("/users/:id", superAdminController.deleteUser);

// Devices
router.get("/devices", superAdminController.getDevices);

// Stats
router.get("/stats", superAdminController.getStats);

// Settings
router.get("/settings", superAdminController.getSystemSettings);
router.patch("/settings", superAdminController.updateSystemSettings);

// API Key Management
router.post("/generate-api-key/:userId", apiKeyController.generateApiKey);

export default router;
