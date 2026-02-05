import express from "express";
import { v4 as uuidv4 } from "uuid";
import prisma from "../prisma.js";

const router = express.Router();

/**
 * POST /admin/devices
 * Create a new device and generate API key
 * Body: { imei, name }
 */
router.post("/devices", async (req, res) => {
  try {
    const { imei, name } = req.body;

    // Validate input
    if (!imei) {
      return res.status(400).json({
        success: false,
        message: "IMEI is required.",
      });
    }

    // Check if device already exists
    const existingDevice = await prisma.device.findUnique({
      where: { imei },
    });
    if (existingDevice) {
      return res.status(409).json({
        success: false,
        message: "Device with this IMEI already exists.",
        device: {
          imei: existingDevice.imei,
          name: existingDevice.name,
          apiKey: existingDevice.apiKey,
        },
      });
    }

    // Generate unique API key
    const apiKey = uuidv4();

    // Create new device
    const device = await prisma.device.create({
      data: {
        imei,
        name: name || `Device ${imei.substring(0, 8)}`,
        apiKey,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Device created successfully.",
      device: {
        imei: device.imei,
        name: device.name,
        apiKey: device.apiKey,
        isActive: device.isActive,
        createdAt: device.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating device:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

/**
 * GET /admin/devices
 * List all devices
 */
router.get("/devices", async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      count: devices.length,
      devices: devices.map((d) => ({
        imei: d.imei,
        name: d.name,
        apiKey: d.apiKey,
        isActive: d.isActive,
        createdAt: d.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching devices:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

/**
 * PATCH /admin/devices/:imei/status
 * Toggle device active status
 */
router.patch("/devices/:imei/status", async (req, res) => {
  try {
    const { imei } = req.params;
    const { isActive } = req.body;

    const existing = await prisma.device.findUnique({
      where: { imei },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Device not found.",
      });
    }

    const newActive = isActive !== undefined ? isActive : !existing.isActive;
    const device = await prisma.device.update({
      where: { imei },
      data: { isActive: newActive },
    });

    res.json({
      success: true,
      message: "Device status updated.",
      device: {
        imei: device.imei,
        name: device.name,
        isActive: device.isActive,
      },
    });
  } catch (error) {
    console.error("Error updating device status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

export default router;
