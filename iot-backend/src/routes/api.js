import express from "express";
import prisma from "../prisma.js";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";

const router = express.Router();

// Apply API key authentication to all routes
router.use(apiKeyAuth);

/**
 * GET /api/readings/current
 * Get latest reading for authenticated device
 * Requires x-api-key header
 */
router.get("/readings/current", async (req, res) => {
  try {
    const deviceImei = req.device.imei;

    // Get latest reading
    const latestReading = await prisma.reading.findFirst({
      where: { deviceImei },
      orderBy: { timestamp: "desc" },
    });

    if (!latestReading) {
      return res.status(404).json({
        success: false,
        message: "No readings found for this device.",
      });
    }

    // Calculate if device is online (last reading within 10 minutes)
    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    const isOnline = latestReading.timestamp >= tenMinutesAgo;

    res.json({
      success: true,
      device_name: req.device.name,
      imei: req.device.imei,
      status: {
        temperature: latestReading.temperature,
        humidity: latestReading.humidity,
        voltage: latestReading.voltage,
        is_online: isOnline,
      },
      last_updated: latestReading.timestamp,
    });
  } catch (error) {
    console.error("Error fetching current reading:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

/**
 * GET /api/readings/history
 * Get historical readings for authenticated device
 * Query params: limit (default: 50)
 * Requires x-api-key header
 */
router.get("/readings/history", async (req, res) => {
  try {
    const deviceImei = req.device.imei;
    const limitRaw = req.query.limit;
    const limit = limitRaw != null ? parseInt(limitRaw, 10) : 50;
    const safeLimit = Number.isNaN(limit) ? 50 : limit;

    // Validate limit
    if (safeLimit < 1 || safeLimit > 1000) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 1000.",
      });
    }

    // Get readings (newest first, then reverse for chart order: oldest first)
    const readings = await prisma.reading.findMany({
      where: { deviceImei },
      take: safeLimit,
      orderBy: { timestamp: "desc" },
      select: { timestamp: true, temperature: true, humidity: true },
    });

    const orderedReadings = [...readings].reverse();

    res.json({
      success: true,
      count: orderedReadings.length,
      readings: orderedReadings,
    });
  } catch (error) {
    console.error("Error fetching reading history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

/**
 * GET /api/readings/stats
 * Get statistics for authenticated device
 * Query params: hours (default: 24)
 */
router.get("/readings/stats", async (req, res) => {
  try {
    const deviceImei = req.device.imei;
    const hoursRaw = req.query.hours;
    const hours = hoursRaw != null ? parseInt(hoursRaw, 10) : 24;
    const safeHours = Number.isNaN(hours) ? 24 : hours;

    // Calculate time range
    const now = new Date();
    const startTime = new Date(now.getTime() - safeHours * 60 * 60 * 1000);

    // Get readings in time range
    const readings = await prisma.reading.findMany({
      where: {
        deviceImei,
        timestamp: { gte: startTime },
      },
      select: { temperature: true, humidity: true },
    });

    if (readings.length === 0) {
      return res.json({
        success: true,
        message: "No readings in specified time range.",
        stats: null,
      });
    }

    // Calculate statistics
    const temps = readings.map((r) => r.temperature).filter((t) => t !== null);
    const humidities = readings
      .map((r) => r.humidity)
      .filter((h) => h !== null);

    const stats = {
      temperature: {
        min: Math.min(...temps),
        max: Math.max(...temps),
        avg: (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1),
      },
      humidity:
        humidities.length > 0
          ? {
              min: Math.min(...humidities),
              max: Math.max(...humidities),
              avg: (
                humidities.reduce((a, b) => a + b, 0) / humidities.length
              ).toFixed(1),
            }
          : null,
      period: {
        hours: safeHours,
        readings_count: readings.length,
      },
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error calculating stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

export default router;
