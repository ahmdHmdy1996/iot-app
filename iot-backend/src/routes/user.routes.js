import express from "express";
import {
  authMiddleware,
  authorizeRole,
} from "../middlewares/auth.middleware.js";
import * as settingsController from "../controllers/settings.controller.js";
import * as userController from "../controllers/user.controller.js";

const router = express.Router();

// Protect all routes: JWT auth + CLIENT/ADMIN role
router.use(authMiddleware);
router.use(authorizeRole(["CLIENT", "ADMIN"]));

// User settings (notifications, webhook)
router.get("/settings", settingsController.getUserSettings);
router.put("/settings", settingsController.updateUserSettings);
router.post("/generate-token", settingsController.generateToken);

export default router;
