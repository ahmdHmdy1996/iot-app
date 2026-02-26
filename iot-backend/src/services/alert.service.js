import prisma from "../config/db.js";
import { getDeviceForRole } from "./device.service.js";

/**
 * Get alert history for a device (with ownership check).
 */
export async function getAlerts(imei, userId, role, limit = 50) {
  const device = await getDeviceForRole(imei, userId, role);
  if (!device) {
    const err = new Error("Access denied or device not found.");
    err.statusCode = 403;
    throw err;
  }

  const alerts = await prisma.alertLog.findMany({
    where: { deviceImei: imei },
    take: Number(limit),
    orderBy: { timestamp: "desc" },
  });

  return {
    device: { imei: device.imei, name: device.name },
    alerts,
  };
}

/**
 * Get audit report: device + readings + alerts in date range.
 */
export async function getAuditReport(imei, userId, role, from, to) {
  if (!from || !to) {
    const err = new Error(
      "Query params 'from' and 'to' (ISO dates) are required.",
    );
    err.statusCode = 400;
    throw err;
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    const err = new Error("Invalid date format for 'from' or 'to'.");
    err.statusCode = 400;
    throw err;
  }

  const device = await getDeviceForRole(imei, userId, role);
  if (!device) {
    const err = new Error("Access denied or device not found.");
    err.statusCode = 403;
    throw err;
  }

  const [readings, alerts] = await Promise.all([
    prisma.reading.findMany({
      where: {
        deviceImei: imei,
        timestamp: { gte: fromDate, lte: toDate },
      },
      orderBy: { timestamp: "asc" },
    }),
    prisma.alertLog.findMany({
      where: {
        deviceImei: imei,
        timestamp: { gte: fromDate, lte: toDate },
      },
      orderBy: { timestamp: "asc" },
    }),
  ]);

  return {
    device: {
      imei: device.imei,
      name: device.name,
      minTemp: device.minTemp,
      maxTemp: device.maxTemp,
    },
    readings,
    alerts,
  };
}
