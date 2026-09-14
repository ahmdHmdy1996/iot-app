import prisma from "../config/db.js";

/**
 * Helper: load device and ensure it belongs to the authenticated user.
 */
async function getDeviceForUser(imei, userId) {
  const device = await prisma.device.findUnique({ where: { imei } });
  if (!device) return { device: null, notFound: true };
  if (device.userId !== userId) return { device: null, forbidden: true };
  return { device, notFound: false, forbidden: false };
}

/**
 * Register a device via external API (Cater Flow). Enforces maxDevices.
 */
export async function addExternalDevice(
  userId,
  { imei, name, minTemp, maxTemp, minHumidity, maxHumidity, calibrationOffset },
) {
  if (!imei || typeof imei !== "string" || !imei.trim()) {
    const err = new Error("IMEI is required");
    err.statusCode = 400;
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { devices: true } } },
  });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (user._count.devices >= user.maxDevices) {
    const err = new Error(
      `Device limit reached (${user.maxDevices}). Upgrade plan to add more devices.`,
    );
    err.statusCode = 400;
    throw err;
  }

  try {
    const device = await prisma.device.create({
      data: {
        imei: imei.trim(),
        name: name != null && name !== "" ? String(name).trim() : null,
        minTemp: minTemp != null && minTemp !== "" ? Number(minTemp) : null,
        maxTemp: maxTemp != null && maxTemp !== "" ? Number(maxTemp) : null,
        minHumidity:
          minHumidity != null && minHumidity !== "" ? Number(minHumidity) : null,
        maxHumidity:
          maxHumidity != null && maxHumidity !== "" ? Number(maxHumidity) : null,
        calibrationOffset:
          calibrationOffset != null && calibrationOffset !== ""
            ? Number(calibrationOffset)
            : 0,
        isActive: true,
        userId,
      },
    });

    return device;
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error("A device with this IMEI already exists");
      err.statusCode = 400;
      throw err;
    }
    throw error;
  }
}

/**
 * Update device settings via external API. Device must belong to user.
 */
export async function updateExternalDevice(
  userId,
  imei,
  { name, minTemp, maxTemp, minHumidity, maxHumidity, calibrationOffset, isActive },
) {
  const { device, notFound, forbidden } = await getDeviceForUser(imei, userId);
  if (notFound) {
    const err = new Error("Device not found");
    err.statusCode = 404;
    throw err;
  }
  if (forbidden) {
    const err = new Error("Access denied to this device");
    err.statusCode = 403;
    throw err;
  }

  const data = {};
  if (name !== undefined)
    data.name = name === null || name === "" ? null : String(name).trim();
  if (minTemp !== undefined)
    data.minTemp = minTemp === null || minTemp === "" ? null : Number(minTemp);
  if (maxTemp !== undefined)
    data.maxTemp = maxTemp === null || maxTemp === "" ? null : Number(maxTemp);
  if (minHumidity !== undefined)
    data.minHumidity =
      minHumidity === null || minHumidity === "" ? null : Number(minHumidity);
  if (maxHumidity !== undefined)
    data.maxHumidity =
      maxHumidity === null || maxHumidity === "" ? null : Number(maxHumidity);
  if (calibrationOffset !== undefined)
    data.calibrationOffset =
      calibrationOffset === null || calibrationOffset === ""
        ? 0
        : Number(calibrationOffset);
  if (isActive !== undefined) data.isActive = Boolean(isActive);

  try {
    const updatedDevice = await prisma.device.update({
      where: { imei },
      data,
    });
    return updatedDevice;
  } catch (error) {
    if (error.code === "P2025") {
      const err = new Error("Device not found");
      err.statusCode = 404;
      throw err;
    }
    throw error;
  }
}

/**
 * Delete a device via external API (CaterFlow). Device must belong to user.
 * Returns the deleted device so the caller can decide on follow-up actions.
 */
export async function deleteExternalDevice(userId, imei) {
  const { device, notFound, forbidden } = await getDeviceForUser(imei, userId);
  if (notFound) {
    const err = new Error("Device not found");
    err.statusCode = 404;
    throw err;
  }
  if (forbidden) {
    const err = new Error("Access denied to this device");
    err.statusCode = 403;
    throw err;
  }

  await prisma.device.delete({ where: { imei } });
  return device;
}

/**
 * Get readings via external API. Device must belong to user.
 */
export async function getExternalReadings(userId, imei, limit = 50) {
  const rawLimit = parseInt(limit, 10);
  const safeLimit = Number.isNaN(rawLimit)
    ? 50
    : Math.min(Math.max(1, rawLimit), 500);

  const { device, notFound, forbidden } = await getDeviceForUser(imei, userId);
  if (notFound) {
    const err = new Error("Device not found");
    err.statusCode = 404;
    throw err;
  }
  if (forbidden) {
    const err = new Error("Access denied to this device");
    err.statusCode = 403;
    throw err;
  }

  const readings = await prisma.reading.findMany({
    where: { deviceImei: imei },
    take: safeLimit,
    orderBy: { timestamp: "desc" },
  });

  return {
    device: { imei: device.imei, name: device.name },
    readings,
  };
}

/**
 * Get device reading history (last N readings, newest first).
 * Each reading is annotated with a derived `alertStatus` so the CaterFlow
 * frontend can colour-code rows without a separate alerts query.
 */
export async function getDeviceHistory(userId, imei, limit = 100, from, to) {
  const rawLimit = parseInt(limit, 10);
  const safeLimit = Number.isNaN(rawLimit)
    ? 100
    : Math.min(Math.max(1, rawLimit), 500);

  const { device, notFound, forbidden } = await getDeviceForUser(imei, userId);
  if (notFound) {
    const err = new Error("Device not found");
    err.statusCode = 404;
    throw err;
  }
  if (forbidden) {
    const err = new Error("Access denied to this device");
    err.statusCode = 403;
    throw err;
  }

  const hasDateRange = from && to;
  const where = { deviceImei: imei };
  if (hasDateRange) {
    const fromDate = new Date(from);
    const toDate   = new Date(to);
    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
      where.timestamp = { gte: fromDate, lte: toDate };
    }
  }

  const readings = await prisma.reading.findMany({
    where,
    ...(hasDateRange ? {} : { take: safeLimit }),
    orderBy: { timestamp: "desc" },
  });

  // Derive per-reading alert status from the device's configured thresholds.
  // This lets the frontend colour-code each row without a separate alerts query.
  const annotated = readings.map((r) => {
    let alertStatus = "NORMAL";
    if (device.maxTemp != null && r.temperature > device.maxTemp)
      alertStatus = "TEMPERATURE_HIGH";
    else if (device.minTemp != null && r.temperature < device.minTemp)
      alertStatus = "TEMPERATURE_LOW";

    let humidityAlertStatus = "NORMAL";
    if (r.humidity != null) {
      if (device.maxHumidity != null && r.humidity > device.maxHumidity)
        humidityAlertStatus = "HUMIDITY_HIGH";
      else if (device.minHumidity != null && r.humidity < device.minHumidity)
        humidityAlertStatus = "HUMIDITY_LOW";
    }

    return {
      id: r.id,
      temperature: r.temperature,
      humidity: r.humidity,
      voltage: r.voltage,
      batteryLevel: device.batteryLevel ?? null,
      // Two times, deliberately. `timestamp` is when the packet reached the
      // server; `recordedAt` is when the device says it took the reading.
      // They differ by however long the device was offline buffering.
      timestamp: r.timestamp,
      recordedAt: r.recordedAt ?? null,
      clockTrusted: r.clockTrusted ?? true,
      alertStatus,
      humidityAlertStatus,
    };
  });

  return {
    device: {
      imei: device.imei,
      name: device.name,
      minTemp: device.minTemp,
      maxTemp: device.maxTemp,
      minHumidity: device.minHumidity,
      maxHumidity: device.maxHumidity,
    },
    readings: annotated,
    total: annotated.length,
  };
}

/**
 * Get alerts via external API. Device must belong to user.
 */
export async function getExternalAlerts(userId, imei, limit = 100) {
  const rawLimit = parseInt(limit, 10);
  const safeLimit = Number.isNaN(rawLimit)
    ? 100
    : Math.min(Math.max(1, rawLimit), 500);

  const { device, notFound, forbidden } = await getDeviceForUser(imei, userId);
  if (notFound) {
    const err = new Error("Device not found");
    err.statusCode = 404;
    throw err;
  }
  if (forbidden) {
    const err = new Error("Access denied to this device");
    err.statusCode = 403;
    throw err;
  }

  const alerts = await prisma.alertLog.findMany({
    where: { deviceImei: imei },
    take: safeLimit,
    orderBy: { timestamp: "desc" },
  });

  return {
    device: { imei: device.imei, name: device.name },
    alerts,
  };
}
