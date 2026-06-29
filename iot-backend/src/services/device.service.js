import prisma from "../config/db.js";
import { sendCaterflowDeleteWebhook } from "../utils/webhook.util.js";

// ─── Helper: verify device ownership ───

async function getDeviceForRole(imei, userId, role) {
  let device;
  if (role === "ADMIN") {
    device = await prisma.device.findUnique({ where: { imei } });
  } else {
    device = await prisma.device.findFirst({ where: { imei, userId } });
  }
  return device;
}

// ─── Super Admin Devices ───

/**
 * Get all devices (Super Admin).
 */
export async function getSuperAdminDevices() {
  return prisma.device.findMany({
    include: {
      user: { select: { username: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Client Devices ───

/**
 * List all devices for the logged-in user.
 */
export async function getUserDevices(userId, query = {}) {
  const { source, externalRefId } = query;

  const where = { userId };
  if (source) where.source = source;
  if (externalRefId) where.externalRefId = externalRefId;

  const devices = await prisma.device.findMany({
    where,
    include: {
      readings: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return devices.map((d) => ({
    imei: d.imei,
    name: d.name,
    isActive: d.isActive,
    minTemp: d.minTemp,
    maxTemp: d.maxTemp,
    calibrationOffset: d.calibrationOffset,
    batteryLevel: d.batteryLevel,
    isOffline: d.isOffline,
    lastOnline: d.readings[0]?.timestamp || null,
    latestTemp: d.readings[0]?.temperature || null,
  }));
}

/**
 * Client adds a device (enforces maxDevices).
 * Triggers CaterFlow Master bypass if source === "CATERFLOW" OR caterflowRestaurantId
 * is provided — whichever arrives first acts as the B2B signal.
 */
export async function addUserDevice(
  userId,
  { imei, name, minTemp, maxTemp, calibrationOffset, source, externalRefId, caterflowRestaurantId },
) {
  if (!imei || typeof imei !== "string" || !imei.trim()) {
    const err = new Error("IMEI is required");
    err.statusCode = 400;
    throw err;
  }

  let resolvedUserId = userId;

  // ── B2B: CaterFlow Master Account bypass ────────────────────────────────
  // Triggered by EITHER signal:
  //   • source === "CATERFLOW"      — always sent by CaterFlow (primary trigger)
  //   • caterflowRestaurantId       — present when tenant ID is known (secondary)
  // Using both makes the bypass robust even if one field is missing.
  const isCaterflowRequest = source === "CATERFLOW" || Boolean(caterflowRestaurantId);

  if (isCaterflowRequest) {
    const masterUser = await prisma.user.findUnique({
      where: { username: "caterflow_master" },
    });

    // Hard fail with a clear message — never let a null ID reach Prisma
    if (!masterUser) {
      const err = new Error(
        "CaterFlow Master user not found in TempFlow DB. Please run the seed: node prisma/seed.js",
      );
      err.statusCode = 500;
      throw err;
    }

    resolvedUserId = masterUser.id; // guaranteed non-null from this point
    source = "CATERFLOW";           // normalise source regardless of which trigger fired
  } else {
    // Standard flow: enforce per-user device limit
    const user = await prisma.user.findUnique({
      where: { id: resolvedUserId },
      include: { _count: { select: { devices: true } } },
    });
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    if (user._count.devices >= user.maxDevices) {
      const err = new Error(
        `You have reached your device limit (${user.maxDevices}). Upgrade your plan to add more devices.`,
      );
      err.statusCode = 400;
      throw err;
    }
  }
  // ────────────────────────────────────────────────────────────────────────

  try {
    const device = await prisma.device.create({
      data: {
        imei: imei.trim(),
        name: name != null && name !== "" ? String(name).trim() : null,
        minTemp: minTemp != null && minTemp !== "" ? Number(minTemp) : null,
        maxTemp: maxTemp != null && maxTemp !== "" ? Number(maxTemp) : null,
        calibrationOffset:
          calibrationOffset != null && calibrationOffset !== ""
            ? Number(calibrationOffset)
            : 0,
        source: source || "DEFAULT",
        externalRefId: externalRefId || null,
        caterflowRestaurantId: caterflowRestaurantId || null,
        isActive: true,
        userId: resolvedUserId,
      },
    });

    return device;
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error("Device with this IMEI already exists.");
      err.statusCode = 400;
      err.code = "P2002"; // Preserve the code for the controller
      throw err;
    }
    throw error;
  }
}

/**
 * Client updates their own device.
 */
export async function updateUserDevice(
  userId,
  imei,
  { name, minTemp, maxTemp, calibrationOffset, isActive },
) {
  const device = await prisma.device.findUnique({ where: { imei } });
  if (!device) {
    const err = new Error("Device not found");
    err.statusCode = 404;
    throw err;
  }
  if (device.userId !== userId) {
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
 * Client deletes their own device.
 */
export async function deleteUserDevice(userId, imei) {
  const device = await prisma.device.findUnique({ where: { imei } });
  if (!device) {
    const err = new Error("Device not found");
    err.statusCode = 404;
    throw err;
  }
  if (device.userId !== userId) {
    const err = new Error("Access denied to this device");
    err.statusCode = 403;
    throw err;
  }

  try {
    await prisma.device.delete({ where: { imei } });
  } catch (error) {
    if (error.code === "P2025") {
      const err = new Error("Device not found");
      err.statusCode = 404;
      throw err;
    }
    throw error;
  }

  // Keep CaterFlow's mirror in sync when a CaterFlow-sourced device is removed.
  if (device.source === "CATERFLOW") {
    sendCaterflowDeleteWebhook(imei).catch((err) =>
      console.warn("[device.service] CaterFlow delete webhook error:", err?.message),
    );
  }
}

// ─── Admin Devices (ADMIN role) ───

/**
 * Admin creates a device (inventory). Optionally assign to a user and enforce maxDevices.
 */
export async function createAdminDevice({
  imei,
  name,
  minTemp,
  maxTemp,
  calibrationOffset,
  userId,
}) {
  if (!imei) {
    const err = new Error("IMEI is required");
    err.statusCode = 400;
    throw err;
  }

  // If a user is specified, validate existence and enforce device limit
  if (userId != null && userId !== "") {
    const uid = Number(userId);
    const user = await prisma.user.findUnique({
      where: { id: uid },
      include: { _count: { select: { devices: true } } },
    });
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    if (user._count.devices >= user.maxDevices) {
      const err = new Error(
        `User has reached their device limit (${user.maxDevices}). Upgrade plan or increase maxDevices.`,
      );
      err.statusCode = 400;
      throw err;
    }
  }

  const data = {
    imei,
    name: name ?? undefined,
    isActive: true,
  };
  if (userId != null && userId !== "") data.userId = Number(userId);
  if (minTemp != null && minTemp !== "") data.minTemp = Number(minTemp);
  if (maxTemp != null && maxTemp !== "") data.maxTemp = Number(maxTemp);
  if (calibrationOffset != null && calibrationOffset !== "")
    data.calibrationOffset = Number(calibrationOffset);

  try {
    const newDevice = await prisma.device.create({ data });
    return newDevice;
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error("Device with this IMEI already exists.");
      err.statusCode = 400;
      err.code = "P2002";
      throw err;
    }
    throw error;
  }
}

/**
 * Admin updates a device.
 */
export async function updateAdminDevice(
  imei,
  { name, minTemp, maxTemp, calibrationOffset, isActive },
) {
  const data = {};
  if (name !== undefined) data.name = name;
  if (isActive !== undefined) data.isActive = Boolean(isActive);
  if (minTemp !== undefined)
    data.minTemp = minTemp === null || minTemp === "" ? null : Number(minTemp);
  if (maxTemp !== undefined)
    data.maxTemp = maxTemp === null || maxTemp === "" ? null : Number(maxTemp);
  if (calibrationOffset !== undefined)
    data.calibrationOffset =
      calibrationOffset === null || calibrationOffset === ""
        ? 0
        : Number(calibrationOffset);

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
 * Admin deletes a device.
 */
export async function deleteAdminDevice(imei) {
  // Load first so we know whether to notify CaterFlow after deletion.
  const device = await prisma.device.findUnique({ where: { imei } });
  try {
    await prisma.device.delete({ where: { imei } });
  } catch (error) {
    if (error.code === "P2025") {
      const err = new Error("Device not found");
      err.statusCode = 404;
      throw err;
    }
    throw error;
  }

  if (device?.source === "CATERFLOW") {
    sendCaterflowDeleteWebhook(imei).catch((err) =>
      console.warn("[device.service] CaterFlow delete webhook error:", err?.message),
    );
  }
}

/**
 * Admin assigns a device to a user (enforces maxDevices).
 */
export async function assignDevice(imei, userId) {
  if (!imei || !userId) {
    const err = new Error("IMEI and UserID required");
    err.statusCode = 400;
    throw err;
  }

  const uid = Number(userId);

  const user = await prisma.user.findUnique({
    where: { id: uid },
    include: { _count: { select: { devices: true } } },
  });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const existingDevice = await prisma.device.findUnique({ where: { imei } });
  if (!existingDevice) {
    const err = new Error("Device not found");
    err.statusCode = 404;
    throw err;
  }

  const currentCount = user._count.devices;
  const isReassignToSameUser = existingDevice.userId === uid;
  if (!isReassignToSameUser && currentCount >= user.maxDevices) {
    const err = new Error(
      `User has reached their device limit (${user.maxDevices}). Upgrade plan or increase maxDevices.`,
    );
    err.statusCode = 400;
    throw err;
  }

  try {
    const updatedDevice = await prisma.device.update({
      where: { imei },
      data: { userId: uid },
    });

    return { device: updatedDevice, username: user.username };
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
 * Admin lists all devices with readings (formatted).
 */
export async function getAllAdminDevicesList() {
  const devices = await prisma.device.findMany({
    include: {
      user: { select: { username: true } },
      readings: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return devices.map((d) => ({
    imei: d.imei,
    name: d.name,
    isActive: d.isActive,
    minTemp: d.minTemp,
    maxTemp: d.maxTemp,
    calibrationOffset: d.calibrationOffset,
    batteryLevel: d.batteryLevel,
    isOffline: d.isOffline,
    assignedTo: d.user?.username || "Unassigned",
    source: d.source,
    caterflowRestaurantId: d.caterflowRestaurantId || null,
    lastOnline: d.readings[0]?.timestamp || null,
    latestTemp: d.readings[0]?.temperature || null,
  }));
}

/**
 * Super Admin: fetch every device that was registered by CaterFlow.
 * Matches on source = 'CATERFLOW' OR caterflowRestaurantId IS NOT NULL
 * (dual-filter matches both registration paths).
 */
export async function getCaterflowDevices() {
  const devices = await prisma.device.findMany({
    where: {
      OR: [
        { source: "CATERFLOW" },
        { caterflowRestaurantId: { not: null } },
      ],
    },
    include: {
      user: { select: { username: true } },
      readings: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return devices.map((d) => ({
    imei:                  d.imei,
    name:                  d.name,
    isActive:              d.isActive,
    isOffline:             d.isOffline,
    minTemp:               d.minTemp,
    maxTemp:               d.maxTemp,
    batteryLevel:          d.batteryLevel,
    source:                d.source,
    caterflowRestaurantId: d.caterflowRestaurantId ?? null,
    externalRefId:         d.externalRefId ?? null,
    lastAlertStatus:       d.lastAlertStatus,
    lastOnline:            d.readings[0]?.timestamp ?? null,
    latestTemp:            d.readings[0]?.temperature ?? null,
    latestHumidity:        d.readings[0]?.humidity ?? null,
    createdAt:             d.createdAt,
  }));
}

// ─── Shared helpers (for readings/dashboard ownership) ───
export { getDeviceForRole };
