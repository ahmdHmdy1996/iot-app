import express from "express";
import prisma from "../prisma.js";

const router = express.Router();

/**
 * Middleware to check External API Token
 */
const externalAuth = (req, res, next) => {
  const token = req.headers["x-external-token"];
  const secret = process.env.EXTERNAL_API_SECRET;

  if (!secret) {
    console.error("EXTERNAL_API_SECRET not set");
    return res
      .status(500)
      .json({ success: false, message: "Server configuration error" });
  }

  if (token !== secret) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or missing External Token" });
  }

  next();
};

router.use(externalAuth);

/**
 * GET /api/external/device/:imei
 * Get latest reading for a specific device (for Restaurant App)
 */
router.get("/device/:imei", async (req, res) => {
  try {
    const { imei } = req.params;

    const device = await prisma.device.findUnique({
      where: { imei },
      include: {
        readings: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
      },
    });

    if (!device) {
      return res
        .status(404)
        .json({ success: false, message: "Device not found" });
    }

    const latestReading = device.readings[0];

    // Determine online status (optional logic, e.g. 10 mins)
    const isOnline = latestReading
      ? new Date() - new Date(latestReading.timestamp) < 10 * 60 * 1000
      : false;

    res.json({
      success: true,
      device: {
        imei: device.imei,
        name: device.name,
        isOnline,
      },
      latest_reading: latestReading || null,
    });
  } catch (error) {
    console.error("Error in external API:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
