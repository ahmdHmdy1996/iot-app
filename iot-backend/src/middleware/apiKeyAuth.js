import prisma from "../prisma.js";

/**
 * API Key Authentication Middleware
 * Validates x-api-key header and attaches device info to request
 */
export async function apiKeyAuth(req, res, next) {
  try {
    // Extract API key from header
    const apiKey = req.headers["x-api-key"];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "API key is required. Please provide x-api-key header.",
      });
    }

    // Find device with this API key
    const device = await prisma.device.findUnique({
      where: { apiKey },
    });

    if (!device) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key.",
      });
    }

    // Check if device is active
    if (!device.isActive) {
      return res.status(403).json({
        success: false,
        message: "Device is inactive. Please contact administrator.",
      });
    }

    // Attach device info to request
    req.device = device;

    next();
  } catch (error) {
    console.error("API Key Auth Error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during authentication.",
    });
  }
}
