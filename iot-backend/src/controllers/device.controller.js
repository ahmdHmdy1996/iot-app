import * as deviceService from "../services/device.service.js";

// ─── Client Device Operations ───

export async function getUserDevices(req, res) {
  try {
    // If system auth, userId is optional (can filter by source/externalRefId instead)
    const userId = req.user?.id || (req.query.userId ? Number(req.query.userId) : undefined);
    
    const data = await deviceService.getUserDevices(userId, req.query);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching user devices:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

export async function addUserDevice(req, res) {
  try {
    const userId = req.user?.id || (req.body.userId ? Number(req.body.userId) : null);
    
    if (!userId && !req.isSystemAuth) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const device = await deviceService.addUserDevice(userId, req.body);
    res
      .status(201)
      .json({ success: true, message: "Device added successfully", device });
  } catch (error) {
    // Handle Prisma Unique Constraint Violation (duplicate IMEI)
    if (error.code === "P2002") {
      return res.status(400).json({
        success: false,
        message: "Device with this IMEI already exists.",
      });
    }

    console.error("Error adding device:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

export async function updateUserDevice(req, res) {
  try {
    const device = await deviceService.updateUserDevice(
      req.user.id,
      req.params.imei,
      req.body,
    );
    res.json({ success: true, message: "Device updated", device });
  } catch (error) {
    console.error("Error updating device:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

export async function deleteUserDevice(req, res) {
  try {
    await deviceService.deleteUserDevice(req.user.id, req.params.imei);
    res.json({ success: true, message: "Device deleted" });
  } catch (error) {
    console.error("Error deleting device:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

// ─── Admin Device Operations ───

export async function createAdminDevice(req, res) {
  try {
    const device = await deviceService.createAdminDevice(req.body);
    res.json({ success: true, message: "Device added to inventory", device });
  } catch (error) {
    console.error("Error creating device:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

export async function updateAdminDevice(req, res) {
  try {
    const device = await deviceService.updateAdminDevice(
      req.params.imei,
      req.body,
    );
    res.json({ success: true, message: "Device updated", device });
  } catch (error) {
    console.error("Error updating device:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

export async function deleteAdminDevice(req, res) {
  try {
    await deviceService.deleteAdminDevice(req.params.imei);
    res.json({ success: true, message: "Device deleted" });
  } catch (error) {
    console.error("Error deleting device:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

export async function assignDevice(req, res) {
  try {
    const { device, username } = await deviceService.assignDevice(
      req.body.imei,
      req.body.userId,
    );
    res.json({
      success: true,
      message: `Device ${req.body.imei} assigned to user ${username}`,
      device,
    });
  } catch (error) {
    console.error("Error assigning device:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

export async function getAllAdminDevices(req, res) {
  try {
    const data = await deviceService.getAllAdminDevicesList();
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching all devices:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}

export async function getCaterflowDevices(req, res) {
  try {
    const data = await deviceService.getCaterflowDevices();
    res.json({ success: true, data, total: data.length });
  } catch (error) {
    console.error("Error fetching CaterFlow devices:", error);
    res
      .status(error.statusCode || 500)
      .json({ success: false, message: error.message || "Server error" });
  }
}
