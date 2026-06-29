import express from "express";
import { authenticateExternalApi } from "../middlewares/externalAuth.middleware.js";
import * as externalController from "../controllers/external.controller.js";

const router = express.Router();

// Protect all external routes with API token auth
router.use(authenticateExternalApi);

// Devices
router.post("/devices/add", externalController.addDevice);
router.patch("/devices/:imei", externalController.updateDevice);
router.delete("/devices/:imei", externalController.deleteDevice);
router.get("/devices/:imei/history", externalController.getDeviceHistory);
router.get("/devices/:imei/readings", externalController.getReadings);
router.get("/devices/:imei/alerts", externalController.getAlerts);

export default router;
