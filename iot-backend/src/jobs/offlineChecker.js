/**
 * Automated Offline Checker job.
 * Runs every 5 minutes: finds active devices with no recent reading (15+ min),
 * marks them offline, creates OFFLINE AlertLog, and triggers email/WhatsApp per user preferences.
 */
import cron from "node-cron";
import prisma from "../config/db.js";
import { sendEmailAlert, sendWhatsAppAlert } from "../utils/notifications.js";

const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
const OFFLINE_MESSAGE =
  "🚨 انقطاع الاتصال | Device has not sent data for over 15 minutes.";

async function runOfflineCheck() {
  const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

  const devices = await prisma.device.findMany({
    where: { isActive: true, isOffline: false },
    include: {
      user: true,
      readings: { orderBy: { timestamp: "desc" }, take: 1 },
    },
  });

  const toMarkOffline = devices.filter((d) => {
    const lastReading = d.readings[0];
    return !lastReading || lastReading.timestamp < cutoff;
  });

  for (const device of toMarkOffline) {
    try {
      await prisma.device.update({
        where: { imei: device.imei },
        data: { isOffline: true },
      });

      await prisma.alertLog.create({
        data: {
          deviceImei: device.imei,
          alertType: "OFFLINE",
          message: OFFLINE_MESSAGE,
          resolved: false,
        },
      });

      const deviceLabel = device.name || device.imei;
      const alertMessage = `🚨 نظام التنبيهات | Offline: Device [${deviceLabel}] has not sent data for over 15 minutes.`;

      if (device.user) {
        if (device.user.alertEmailEnabled && device.user.alertEmail) {
          sendEmailAlert(
            device.user.alertEmail,
            `IoT Offline Alert: ${deviceLabel}`,
            alertMessage,
          ).catch((err) => {
            console.warn("[OfflineChecker] Email alert error:", err?.message);
          });
        }
        if (device.user.alertWhatsAppEnabled && device.user.alertWhatsApp) {
          sendWhatsAppAlert(device.user.alertWhatsApp, alertMessage).catch(
            (err) => {
              console.warn(
                "[OfflineChecker] WhatsApp alert error:",
                err?.message,
              );
            },
          );
        }
      }

      console.log("[OfflineChecker] Marked offline and alerted:", device.imei);
    } catch (err) {
      console.error(
        "[OfflineChecker] Error processing device",
        device.imei,
        err,
      );
    }
  }
}

let scheduledTask = null;

/**
 * Start the offline checker: schedule every 5 minutes and run once immediately.
 */
export function startOfflineChecker() {
  if (scheduledTask) return;
  scheduledTask = cron.schedule("*/5 * * * *", runOfflineCheck);
  runOfflineCheck().catch((err) =>
    console.warn("[OfflineChecker] Initial run error:", err?.message),
  );
  console.log("[OfflineChecker] Started (every 5 minutes).");
}

/**
 * Stop the offline checker (e.g. on graceful shutdown).
 */
export function stopOfflineChecker() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log("[OfflineChecker] Stopped.");
  }
}
