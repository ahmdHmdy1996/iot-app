import express from "express";
import prisma from "../prisma.js";
import { authMiddleware, authorizeRole } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply JWT authentication to all routes in this router
router.use(authMiddleware);
router.use(authorizeRole(["CLIENT", "ADMIN"])); // Allow Clients and Admins

/**
 * GET /api/my-devices
 * List all devices assigned to the logged-in user
 */
router.get("/my-devices", async (req, res) => {
  try {
    const userId = req.user.id;

    const devices = await prisma.device.findMany({
      where: { userId: userId },
      include: {
        // Optional: Include latest reading if needed for list view
        readings: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format response
    const formattedDevices = devices.map((d) => ({
      imei: d.imei,
      name: d.name,
      isActive: d.isActive,
      lastOnline: d.readings[0]?.timestamp || null,
      latestTemp: d.readings[0]?.temperature || null,
    }));

    res.json({
      success: true,
      data: formattedDevices,
    });
  } catch (error) {
    console.error("Error fetching user devices:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * GET /api/readings/:imei
 * Get readings for a specific device (Ownership check required)
 */
router.get("/readings/:imei", async (req, res) => {
  try {
    const { imei } = req.params;
    const userId = req.user.id;
    const { limit = 50 } = req.query;

    // 1. Check ownership
    // If admin, they can access anything (optional, but requested logic said "CLIENT can only access their own devices")
    // implementation_plan said: "Admin can access everything".
    // So if role is ADMIN, skip ownership check?
    // The prompt requirement: "CLIENT can only access their own devices." "ADMIN can access everything."

    let device;
    if (req.user.role === "ADMIN") {
      device = await prisma.device.findUnique({
        where: { imei },
      });
    } else {
      device = await prisma.device.findFirst({
        where: {
          imei,
          userId,
        },
      });
    }

    if (!device) {
      return res.status(403).json({
        success: false,
        message: "Access denied or device not found.",
      });
    }

    // 2. Fetch Readings
    const readings = await prisma.reading.findMany({
      where: { deviceImei: imei },
      take: Number(limit),
      orderBy: { timestamp: "desc" },
    });

    res.json({
      success: true,
      device: { imei: device.imei, name: device.name },
      readings: readings,
    });
  } catch (error) {
    console.error("Error fetching readings:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
