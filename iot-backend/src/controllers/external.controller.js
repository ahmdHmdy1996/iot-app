import * as externalService from "../services/external.service.js";
import { sendCaterflowDeleteWebhook } from "../utils/webhook.util.js";

/**
 * POST /api/external/devices/add
 */
export async function addDevice(req, res) {
  try {
    const device = await externalService.addExternalDevice(
      req.user.id,
      req.body,
    );
    res
      .status(201)
      .json({
        success: true,
        message: "Device registered successfully",
        device,
      });
  } catch (error) {
    console.error("External API add device:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

/**
 * PATCH /api/external/devices/:imei
 */
export async function updateDevice(req, res) {
  try {
    const device = await externalService.updateExternalDevice(
      req.user.id,
      req.params.imei,
      req.body,
    );
    res.json({ success: true, message: "Device updated", device });
  } catch (error) {
    console.error("External API update device:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

/**
 * DELETE /api/external/devices/:imei
 */
export async function deleteDevice(req, res) {
  try {
    const device = await externalService.deleteExternalDevice(
      req.user.id,
      req.params.imei,
    );
    res.json({ success: true, message: "Device deleted" });
    // Notify CaterFlow so its mirror is removed too. Idempotent: a no-op when
    // CaterFlow initiated the delete (it already dropped its local record).
    if (device?.source === "CATERFLOW") {
      sendCaterflowDeleteWebhook(req.params.imei).catch(() => undefined);
    }
  } catch (error) {
    console.error("External API delete device:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

/**
 * GET /api/external/devices/:imei/readings
 */
export async function getReadings(req, res) {
  try {
    const result = await externalService.getExternalReadings(
      req.user.id,
      req.params.imei,
      req.query.limit,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("External API readings:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

/**
 * GET /api/external/devices/:imei/history
 */
export async function getDeviceHistory(req, res) {
  try {
    const result = await externalService.getDeviceHistory(
      req.user.id,
      req.params.imei,
      req.query.limit,
      req.query.from,
      req.query.to,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("External API history:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

/**
 * GET /api/external/devices/:imei/alerts
 */
export async function getAlerts(req, res) {
  try {
    const result = await externalService.getExternalAlerts(
      req.user.id,
      req.params.imei,
      req.query.limit,
    );
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("External API alerts:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}
