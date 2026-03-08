import * as alertService from "../services/alert.service.js";

/**
 * GET /api/alerts/:imei
 */
export async function getAlerts(req, res) {
  try {
    const { limit = 50, startDate, endDate } = req.query;
    const result = await alertService.getAlerts(
      req.params.imei,
      req.user.id,
      req.user.role,
      limit,
      startDate || null,
      endDate || null,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

/**
 * DELETE /api/alerts/:imei
 */
export async function clearAlerts(req, res) {
  try {
    const result = await alertService.clearAlerts(
      req.params.imei,
      req.user.id,
      req.user.role,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error clearing alerts:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

/**
 * GET /api/audit-report/:imei
 */
export async function getAuditReport(req, res) {
  try {
    const { from, to } = req.query;
    const result = await alertService.getAuditReport(
      req.params.imei,
      req.user.id,
      req.user.role,
      from,
      to,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error fetching audit report:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}
