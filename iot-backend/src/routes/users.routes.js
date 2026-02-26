import express from "express";
import {
  authMiddleware,
  authorizeRole,
} from "../middlewares/auth.middleware.js";
import * as userController from "../controllers/user.controller.js";

const router = express.Router();

// Protect all routes: JWT auth + CLIENT/ADMIN role
router.use(authMiddleware);
router.use(authorizeRole(["CLIENT", "ADMIN"]));

// GET & PATCH /api/users/me
router.get("/me", userController.getProfile);
router.patch("/me", userController.updateProfile);

export default router;
