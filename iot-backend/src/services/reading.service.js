import prisma from "../config/db.js";
import { getDeviceForRole } from "./device.service.js";

/**
 * Get readings for a device (with ownership check).
 */
export async function getReadings(imei, userId, role, limit = 50) {
  const device = await getDeviceForRole(imei, userId, role);
  if (!device) {
    const err = new Error("Access denied or device not found.");
    err.statusCode = 403;
    throw err;
  }

  const readings = await prisma.reading.findMany({
    where: { deviceImei: imei },
    take: Number(limit),
    orderBy: { timestamp: "desc" },
  });

  return {
    device: { imei: device.imei, name: device.name },
    readings,
  };
}

/**
 * Get device dashboard: device info, current reading, daily stats, chart data.
 */
export async function getDeviceDashboard(imei, userId, role) {
  const device = await getDeviceForRole(imei, userId, role);
  if (!device) {
    const err = new Error("Access denied or device not found.");
    err.statusCode = 403;
    throw err;
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const [latestReading, dailyAggregate, chartReadings] = await Promise.all([
    prisma.reading.findFirst({
      where: { deviceImei: imei },
      orderBy: { timestamp: "desc" },
      take: 1,
    }),
    prisma.reading.aggregate({
      where: {
        deviceImei: imei,
        timestamp: { gte: startOfDay, lte: endOfDay },
      },
      _max: { temperature: true },
      _min: { temperature: true },
      _avg: { temperature: true },
    }),
    prisma.reading.findMany({
      where: { deviceImei: imei },
      orderBy: { timestamp: "desc" },
      take: 50,
      select: {
        temperature: true,
        humidity: true,
        voltage: true,
        timestamp: true,
      },
    }),
  ]);

  const currentReading = latestReading
    ? {
        temperature: latestReading.temperature,
        humidity: latestReading.humidity,
        voltage: latestReading.voltage,
        timestamp: latestReading.timestamp,
      }
    : null;

  const dailyStats = {
    maxTemp: dailyAggregate._max.temperature ?? null,
    minTemp: dailyAggregate._min.temperature ?? null,
    avgTemp: dailyAggregate._avg.temperature ?? null,
  };

  const chartData = [...chartReadings].reverse();

  return {
    device: {
      imei: device.imei,
      name: device.name,
      minTemp: device.minTemp,
      maxTemp: device.maxTemp,
      batteryLevel: device.batteryLevel,
      isOffline: device.isOffline,
      isActive: device.isActive,
    },
    currentReading,
    dailyStats,
    chartData,
  };
}

/**
 * Get device daily stats (max, min, avg temperature for today).
 */
export async function getDeviceStats(imei, userId, role) {
  const device = await getDeviceForRole(imei, userId, role);
  if (!device) {
    const err = new Error("Access denied or device not found.");
    err.statusCode = 403;
    throw err;
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const agg = await prisma.reading.aggregate({
    where: {
      deviceImei: imei,
      timestamp: { gte: startOfDay, lte: endOfDay },
    },
    _max: { temperature: true },
    _min: { temperature: true },
    _avg: { temperature: true },
  });

  return {
    maxTemp: agg._max.temperature ?? null,
    minTemp: agg._min.temperature ?? null,
    avgTemp: agg._avg.temperature ?? null,
  };
}
