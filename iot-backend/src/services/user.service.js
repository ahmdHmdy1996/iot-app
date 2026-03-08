import bcrypt from "bcryptjs";
import prisma from "../config/db.js";

// ─── Super Admin User Management ───

/**
 * Get all users (Super Admin).
 */
export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      plan: true,
      maxDevices: true,
      createdAt: true,
      _count: { select: { devices: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Create a new user (Super Admin).
 */
export async function createUser({
  username,
  password,
  role = "CLIENT",
  plan = "BASIC",
  maxDevices = 5,
}) {
  if (!username || !password) {
    const err = new Error("Username and password required");
    err.statusCode = 400;
    throw err;
  }

  const planVal = plan === "PRO" ? "PRO" : "BASIC";
  const maxDev = Math.max(1, Number(maxDevices) || 5);
  const roleVal = ["CLIENT", "ADMIN", "SUPER_ADMIN"].includes(role)
    ? role
    : "CLIENT";

  const hashedPassword = await bcrypt.hash(String(password), 10);

  try {
    const user = await prisma.user.create({
      data: {
        username: String(username).trim(),
        password: hashedPassword,
        role: roleVal,
        plan: planVal,
        maxDevices: maxDev,
      },
      select: {
        id: true,
        username: true,
        role: true,
        plan: true,
        maxDevices: true,
        createdAt: true,
      },
    });

    return user;
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error("Username already exists");
      err.statusCode = 400;
      throw err;
    }
    throw error;
  }
}

/**
 * Update a user (Super Admin). Fields: plan, maxDevices, role, password.
 */
export async function updateUser(id, { plan, maxDevices, role, password }) {
  const numId = Number(id);
  if (Number.isNaN(numId)) {
    const err = new Error("Invalid user ID");
    err.statusCode = 400;
    throw err;
  }

  const data = {};
  if (plan !== undefined) {
    data.plan = plan === "PRO" ? "PRO" : "BASIC";
  }
  if (maxDevices !== undefined) {
    const num = Math.max(1, Number(maxDevices) || 5);
    data.maxDevices = num;
  }
  if (role !== undefined) {
    data.role = ["CLIENT", "ADMIN", "SUPER_ADMIN"].includes(role)
      ? role
      : undefined;
    if (data.role === undefined) delete data.role;
  }
  if (password !== undefined && String(password).trim()) {
    data.password = await bcrypt.hash(String(password).trim(), 10);
  }

  if (Object.keys(data).length === 0) {
    const err = new Error("Provide at least one field to update");
    err.statusCode = 400;
    throw err;
  }

  try {
    const user = await prisma.user.update({
      where: { id: numId },
      data,
      select: {
        id: true,
        username: true,
        role: true,
        plan: true,
        maxDevices: true,
      },
    });

    return user;
  } catch (error) {
    if (error.code === "P2025") {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    throw error;
  }
}

/**
 * Delete a user (Super Admin).
 */
export async function deleteUser(id) {
  const numId = Number(id);
  if (Number.isNaN(numId)) {
    const err = new Error("Invalid user ID");
    err.statusCode = 400;
    throw err;
  }

  try {
    await prisma.user.delete({
      where: { id: numId },
    });
  } catch (error) {
    if (error.code === "P2025") {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    throw error;
  }
}

// ─── Client Profile ───

/**
 * Get the authenticated user's profile.
 * For ADMINs: deviceCount = total devices in the system (they manage inventory).
 * For CLIENTs: deviceCount = devices assigned to them.
 */
export async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      role: true,
      plan: true,
      maxDevices: true,
      alertEmail: true,
      alertWhatsApp: true,
      _count: { select: { devices: true } },
    },
  });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  const { _count, ...rest } = user;
  // ADMINs see total system device count (inventory + assigned); CLIENTs see their own
  const deviceCount =
    user.role === "ADMIN" ? await prisma.device.count() : _count.devices;
  return { ...rest, deviceCount };
}

/**
 * Update the authenticated user's profile (alertWhatsApp, alertEmail, password).
 */
export async function updateUserProfile(
  userId,
  { alertEmail, alertWhatsApp, password },
) {
  const data = {};

  if (alertEmail !== undefined) {
    data.alertEmail =
      alertEmail === null || alertEmail === "" ? null : String(alertEmail);
  }

  if (alertWhatsApp !== undefined) {
    data.alertWhatsApp =
      alertWhatsApp === null || alertWhatsApp === ""
        ? null
        : String(alertWhatsApp);
  }

  if (password !== undefined && String(password).trim()) {
    data.password = await bcrypt.hash(String(password).trim(), 10);
  }

  if (Object.keys(data).length === 0) {
    const err = new Error("Provide at least one field to update");
    err.statusCode = 400;
    throw err;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      username: true,
      role: true,
      plan: true,
      maxDevices: true,
      alertEmail: true,
      alertWhatsApp: true,
      _count: { select: { devices: true } },
    },
  });

  const { _count, ...rest } = user;
  const deviceCount =
    user.role === "ADMIN" ? await prisma.device.count() : _count.devices;

  return { ...rest, deviceCount };
}

// ─── Admin User Management (ADMIN role) ───

/**
 * Get all users (Admin role). Includes device count.
 */
export async function getAdminUsersList() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      plan: true,
      maxDevices: true,
      _count: { select: { devices: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return users.map((u) => {
    const { _count, ...rest } = u;
    return { ...rest, deviceCount: _count.devices };
  });
}

/**
 * Create a user (Admin role).
 */
export async function createAdminUser({ username, password, role = "CLIENT" }) {
  if (!username || !password) {
    const err = new Error("Username and password required");
    err.statusCode = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role,
      },
    });

    return { id: newUser.id, username: newUser.username, role: newUser.role };
  } catch (error) {
    if (error.code === "P2002") {
      const err = new Error("Username already exists");
      err.statusCode = 400;
      throw err;
    }
    throw error;
  }
}

/**
 * Update user plan (Admin role).
 */
export async function updateUserPlan(id, { plan, maxDevices }) {
  const userId = Number(id);
  if (Number.isNaN(userId)) {
    const err = new Error("Invalid user ID");
    err.statusCode = 400;
    throw err;
  }

  const data = {};
  if (plan !== undefined) {
    if (plan !== "BASIC" && plan !== "PRO") {
      const err = new Error("plan must be BASIC or PRO");
      err.statusCode = 400;
      throw err;
    }
    data.plan = plan;
  }
  if (maxDevices !== undefined) {
    const num = Number(maxDevices);
    if (!Number.isInteger(num) || num < 1) {
      const err = new Error("maxDevices must be a positive integer");
      err.statusCode = 400;
      throw err;
    }
    data.maxDevices = num;
  }

  if (Object.keys(data).length === 0) {
    const err = new Error("Provide plan and/or maxDevices");
    err.statusCode = 400;
    throw err;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        role: true,
        plan: true,
        maxDevices: true,
      },
    });

    return updatedUser;
  } catch (error) {
    if (error.code === "P2025") {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    throw error;
  }
}
