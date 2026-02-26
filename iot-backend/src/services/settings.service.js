import crypto from "crypto";
import prisma from "../config/db.js";

// ─── System Settings (Super Admin) ───

/**
 * Get system settings (auto-creates defaults if none exist).
 */
export async function getSystemSettings() {
  return prisma.systemSettings.upsert({
    where: { id: 1 },
    create: {}, // all defaults from the schema
    update: {}, // no-op update, just return existing
  });
}

/**
 * Update system settings.
 */
export async function updateSystemSettings({
  platformName,
  supportEmail,
  timezone,
  smtpHost,
  smtpPort,
  smtpUser,
  smtpPass,
  retentionDays,
  maintenanceMode,
}) {
  const data = {};
  if (platformName !== undefined) data.platformName = String(platformName);
  if (supportEmail !== undefined) data.supportEmail = String(supportEmail);
  if (timezone !== undefined) data.timezone = String(timezone);
  if (smtpHost !== undefined)
    data.smtpHost =
      smtpHost === "" || smtpHost === null ? null : String(smtpHost);
  if (smtpPort !== undefined)
    data.smtpPort =
      smtpPort === "" || smtpPort === null ? null : Number(smtpPort);
  if (smtpUser !== undefined)
    data.smtpUser =
      smtpUser === "" || smtpUser === null ? null : String(smtpUser);
  if (smtpPass !== undefined)
    data.smtpPass =
      smtpPass === "" || smtpPass === null ? null : String(smtpPass);
  if (retentionDays !== undefined)
    data.retentionDays = Math.max(1, Number(retentionDays) || 90);
  if (maintenanceMode !== undefined)
    data.maintenanceMode = Boolean(maintenanceMode);

  if (Object.keys(data).length === 0) {
    const err = new Error("Provide at least one field to update");
    err.statusCode = 400;
    throw err;
  }

  return prisma.systemSettings.upsert({
    where: { id: 1 },
    create: data,
    update: data,
  });
}

// ─── User Settings (Client) ───

/**
 * Get current user's notification, webhook, plan, and API key.
 */
export async function getUserSettings(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      webhookUrl: true,
      alertEmail: true,
      alertWhatsApp: true,
      alertEmailEnabled: true,
      alertWhatsAppEnabled: true,
      plan: true,
      maxDevices: true,
      apiKey: true,
      _count: { select: { devices: true } },
    },
  });
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  const { _count, ...rest } = user;
  return {
    ...rest,
    deviceCount: _count.devices,
  };
}

/**
 * Update user's notification and webhook preferences.
 */
export async function updateUserSettings(
  userId,
  {
    webhookUrl,
    alertEmail,
    alertWhatsApp,
    alertEmailEnabled,
    alertWhatsAppEnabled,
  },
) {
  const data = {};
  if (webhookUrl !== undefined)
    data.webhookUrl =
      webhookUrl === null || webhookUrl === "" ? null : String(webhookUrl);
  if (alertEmail !== undefined)
    data.alertEmail =
      alertEmail === null || alertEmail === "" ? null : String(alertEmail);
  if (alertWhatsApp !== undefined)
    data.alertWhatsApp =
      alertWhatsApp === null || alertWhatsApp === ""
        ? null
        : String(alertWhatsApp);
  if (alertEmailEnabled !== undefined)
    data.alertEmailEnabled = Boolean(alertEmailEnabled);
  if (alertWhatsAppEnabled !== undefined)
    data.alertWhatsAppEnabled = Boolean(alertWhatsAppEnabled);

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return {
    webhookUrl: user.webhookUrl,
    alertEmail: user.alertEmail,
    alertWhatsApp: user.alertWhatsApp,
    alertEmailEnabled: user.alertEmailEnabled,
    alertWhatsAppEnabled: user.alertWhatsAppEnabled,
  };
}

/**
 * Generate a new API key for the current user.
 */
export async function generateApiKey(userId) {
  const key = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: userId },
    data: { apiKey: key },
  });
  return key;
}
