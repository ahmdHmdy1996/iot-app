import prisma from "../config/db.js";
import { getDeviceForRole } from "./device.service.js";

/**
 * Get alert history for a device (with ownership check).
 * Supports optional date range (startDate/endDate) or limit-based fetch.
 */
export async function getAlerts(
  imei,
  userId,
  role,
  limit = 50,
  startDate = null,
  endDate = null,
) {
  const device = await getDeviceForRole(imei, userId, role);
  if (!device) {
    const err = new Error("Access denied or device not found.");
    err.statusCode = 403;
    throw err;
  }

  const where = { deviceImei: imei };
  if (startDate && endDate) {
    const from = new Date(startDate);
    const to = new Date(endDate);
    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
      where.timestamp = { gte: from, lte: to };
    }
  }

  const alerts = await prisma.alertLog.findMany({
    where,
    ...(startDate && endDate ? {} : { take: Number(limit) }),
    orderBy: { timestamp: "asc" },
  });

  return {
    device: { imei: device.imei, name: device.name },
    alerts,
  };
}

/**
 * Clear all alert logs for a device (with ownership check).
 */
export async function clearAlerts(imei, userId, role) {
  const device = await getDeviceForRole(imei, userId, role);
  if (!device) {
    const err = new Error("Access denied or device not found.");
    err.statusCode = 403;
    throw err;
  }

  const { count } = await prisma.alertLog.deleteMany({
    where: { deviceImei: imei },
  });

  return { deleted: count };
}

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
