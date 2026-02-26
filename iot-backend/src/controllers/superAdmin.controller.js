import * as userService from "../services/user.service.js";
import * as deviceService from "../services/device.service.js";
import * as settingsService from "../services/settings.service.js";

// ─── Super Admin: Users ───

export async function getUsers(req, res) {
  try {
    const users = await userService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users (super admin):", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

export async function createUser(req, res) {
  try {
    const user = await userService.createUser(req.body);
    res
      .status(201)
      .json({ success: true, message: "User created successfully", user });
  } catch (error) {
    console.error("Error creating user (super admin):", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

export async function updateUser(req, res) {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json({ success: true, message: "User updated", user });
  } catch (error) {
    console.error("Error updating user (super admin):", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

export async function deleteUser(req, res) {
  try {
    await userService.deleteUser(req.params.id);
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user (super admin):", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

// ─── Super Admin: Devices ───

export async function getDevices(req, res) {
  try {
    const devices = await deviceService.getSuperAdminDevices();
    res.json({ success: true, data: devices });
  } catch (error) {
    console.error("Error fetching devices (super admin):", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

// ─── Super Admin: Stats ───

export async function getStats(req, res) {
  try {
    const prisma = (await import("../config/db.js")).default;
    const [totalUsers, totalDevices, activeAlerts] = await Promise.all([
      prisma.user.count(),
      prisma.device.count(),
      prisma.alertLog.count({ where: { resolved: false } }),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalDevices,
        activeAlerts,
        serverStatus: "Online",
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// ─── Super Admin: Settings ───

export async function getSystemSettings(req, res) {
  try {
    const settings = await settingsService.getSystemSettings();
    res.json({ success: true, settings });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

export async function updateSystemSettings(req, res) {
  try {
    const settings = await settingsService.updateSystemSettings(req.body);
    res.json({ success: true, message: "Settings updated", settings });
  } catch (error) {
    console.error("Error updating system settings:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}
