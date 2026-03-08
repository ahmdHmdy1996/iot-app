import prisma from "../config/db.js";

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
export async function getUserDevices(userId) {
  const devices = await prisma.device.findMany({
    where: { userId },
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
 */
export async function addUserDevice(
  userId,
  { imei, name, minTemp, maxTemp, calibrationOffset },
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
      `You have reached your device limit (${user.maxDevices}). Upgrade your plan to add more devices.`,
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
      const err = new Error("Device with this IMEI already exists");
      err.statusCode = 400;
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
    lastOnline: d.readings[0]?.timestamp || null,
    latestTemp: d.readings[0]?.temperature || null,
  }));
}

// ─── Shared helpers (for readings/dashboard ownership) ───
export { getDeviceForRole };
