import express from "express";
import {
  authMiddleware,
  authorizeRole,
} from "../middlewares/auth.middleware.js";
import * as deviceController from "../controllers/device.controller.js";
import * as userService from "../services/user.service.js";

const router = express.Router();

// Protect all admin routes: JWT auth + ADMIN role
router.use(authMiddleware);
router.use(authorizeRole(["ADMIN"]));

// Users
router.post("/users", async (req, res) => {
  try {
    const user = await userService.createAdminUser(req.body);
    res.json({ success: true, message: "User created successfully", user });
  } catch (error) {
    console.error("Error creating user:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const data = await userService.getAdminUsersList();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
});

router.patch("/users/:id/plan", async (req, res) => {
  try {
    const user = await userService.updateUserPlan(req.params.id, req.body);
    res.json({ success: true, message: "Plan updated", user });
  } catch (error) {
    console.error("Error updating user plan:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
});

// Devices
router.post("/devices", deviceController.createAdminDevice);
router.patch("/devices/:imei", deviceController.updateAdminDevice);
router.delete("/devices/:imei", deviceController.deleteAdminDevice);
router.post("/devices/assign", deviceController.assignDevice);
router.get("/devices", deviceController.getAllAdminDevices);

export default router;
