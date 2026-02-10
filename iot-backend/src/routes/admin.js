import express from "express";
import bcrypt from "bcryptjs";
import prisma from "../prisma.js";
import { authMiddleware, authorizeRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protect all admin routes
router.use(authMiddleware);
router.use(authorizeRole(["ADMIN"]));

/**
 * POST /admin/users
 * Create a new user (Admin or Client)
 */
router.post("/users", async (req, res) => {
  try {
    const { username, password, role = "CLIENT" } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Username and password required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
      },
    });

    res.json({
      success: true,
      message: "User created successfully",
      user: { id: newUser.id, username: newUser.username, role: newUser.role },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ success: false, message: "Username already exists" });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * POST /admin/devices
 * Create a new device (Inventory)
 */
router.post("/devices", async (req, res) => {
  try {
    const { imei, name } = req.body;

    if (!imei) {
      return res
        .status(400)
        .json({ success: false, message: "IMEI is required" });
    }

    const newDevice = await prisma.device.create({
      data: {
        imei,
        name,
        isActive: true,
      },
    });

    res.json({
      success: true,
      message: "Device added to inventory",
      device: newDevice,
    });
  } catch (error) {
    console.error("Error creating device:", error);
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Device with this IMEI already exists",
      });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * POST /admin/devices/assign
 * Assign a device to a user
 */
router.post("/devices/assign", async (req, res) => {
  try {
    const { imei, userId } = req.body;

    if (!imei || !userId) {
      return res
        .status(400)
        .json({ success: false, message: "IMEI and UserID required" });
    }

    // Verify user exists first (optional, Prisma will throw FK error but this is cleaner)
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const updatedDevice = await prisma.device.update({
      where: { imei },
      data: {
        userId: Number(userId),
      },
    });

    res.json({
      success: true,
      message: `Device ${imei} assigned to user ${user.username}`,
      device: updatedDevice,
    });
  } catch (error) {
    console.error("Error assigning device:", error);
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * GET /admin/devices
 * List all devices (Inventory)
 */
router.get("/devices", async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      include: {
        user: {
          select: { username: true },
        },
        readings: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format response to match what frontend expects roughly
    // Frontend expects: { success, data: [...] }
    const formattedDevices = devices.map((d) => ({
      imei: d.imei,
      name: d.name,
      isActive: d.isActive,
      assignedTo: d.user?.username || "Unassigned",
      lastOnline: d.readings[0]?.timestamp || null,
      latestTemp: d.readings[0]?.temperature || null,
    }));

    res.json({
      success: true,
      data: formattedDevices,
    });
  } catch (error) {
    console.error("Error fetching all devices:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
