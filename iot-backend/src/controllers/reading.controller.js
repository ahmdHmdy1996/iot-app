import * as readingService from "../services/reading.service.js";

/**
 * GET /api/readings/:imei
 */
export async function getReadings(req, res) {
  try {
    const { limit = 50, startDate, endDate } = req.query;
    const result = await readingService.getReadings(
      req.params.imei,
      req.user.id,
      req.user.role,
      limit,
      startDate || null,
      endDate || null,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error fetching readings:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

/**
 * GET /api/devices/:imei/dashboard
 */
export async function getDashboard(req, res) {
  try {
    const result = await readingService.getDeviceDashboard(
      req.params.imei,
      req.user.id,
      req.user.role,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error fetching device dashboard:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

/**
 * GET /api/devices/:imei/stats
 */
export async function getStats(req, res) {
  try {
    const stats = await readingService.getDeviceStats(
      req.params.imei,
      req.user.id,
      req.user.role,
    );
    res.json({ success: true, stats });
  } catch (error) {
    console.error("Error fetching device stats:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}
