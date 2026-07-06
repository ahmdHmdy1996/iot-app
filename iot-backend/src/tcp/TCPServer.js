import net from "net";
import moment from "moment";
import prisma from "../config/db.js";
import { parseWf501Packet, isValidWf501Frame } from "./HexParser.js";
import { sendWebhook } from "../utils/webhook.js";
import { sendEmailAlert, sendWhatsAppAlert } from "../utils/notifications.js";
import { sendCaterflowWebhook, sendCaterflowReadingWebhook, sendCaterflowStatusWebhook } from "../utils/webhook.util.js";
import { getIO } from "../socket.js";

// Minimum temperature delta (°C) between the new reading and the last stored
// one for it to be considered "different enough" to persist to history.
const READING_CHANGE_THRESHOLD_C = 1.0;

/**
 * TCP Server for WF501 IoT Devices
 * Handles device connections, data parsing, and ACK responses
 */
class TCPServer {
  constructor(port) {
    this.port = port;
    this.server = null;
    this.clientBuffers = new Map(); // Store buffers per client socket
    this.socketImei = new Map(); // Map socket → device IMEI (set once identified)
  }

  /**
   * Start TCP server
   */
  start() {
    this.server = net.createServer((socket) => {
      const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
      console.log(`[TCP] New device connected: ${clientId}`);

      // Initialize buffer for this client
      this.clientBuffers.set(socket, Buffer.alloc(0));

      // Send sync message immediately on connection
      this.sendSyncMessage(socket);

      // Handle incoming data
      socket.on("data", async (data) => {
        await this.handleIncomingData(socket, data);
      });

      // Handle connection errors
      socket.on("error", (error) => {
        console.error("[TCP] Socket error:", error.message);
        this.handleDisconnect(socket, clientId);
      });

      // Handle disconnection
      socket.on("close", () => {
        console.log(`[TCP] Device disconnected: ${clientId}`);
        this.handleDisconnect(socket, clientId);
      });
    });

    this.server.listen(this.port, () => {
      console.log(`[TCP] TCP Server running on port ${this.port}`);
    });

    this.server.on("error", (error) => {
      console.error("[TCP] Server error:", error);
    });
  }

  /**
   * Clean up a dropped connection's bookkeeping.
   *
   * IMPORTANT: this WF501 hardware does not hold a persistent socket — it
   * connects, sends one packet, and disconnects, repeating on its configured
   * reporting interval (as fast as every ~60s). A TCP close here is the
   * device's *normal* per-reading behavior, not a connectivity failure, so it
   * must NOT be used to flag the device offline (that previously caused the
   * status to flap online/offline every cycle). True offline detection is
   * staleness-based — see jobs/offlineChecker.js, which flags a device only
   * after it has gone quiet for OFFLINE_THRESHOLD_MS with no reading at all.
   * @param {net.Socket} socket
   * @param {string} clientId
   */
  handleDisconnect(socket, clientId) {
    this.clientBuffers.delete(socket);
    this.socketImei.delete(socket);
  }

  /**
   * Send time sync message to device
   * Format: @UTC,yyyy-MM-dd HH:mm:ss#
   * @param {net.Socket} socket - Client socket
   */
  sendSyncMessage(socket) {
    const currentTime = moment.utc().format("YYYY-MM-DD HH:mm:ss");
    const syncMessage = `@UTC,${currentTime}#`;

    socket.write(syncMessage, (err) => {
      if (err) {
        console.error("[TCP] Error sending sync message:", err);
      } else {
        console.log("[TCP] Sync message sent:", syncMessage);
      }
    });
  }

  /**
   * Try to extract one complete WF501 frame from the buffer
   * Frames start with 'TZ' (0x54 0x5A) and end with 0x0D 0x0A
   * @param {Buffer} buffer - Current buffer
   * @returns {{ frame: Buffer|null, remaining: Buffer }}
   */
  extractOneFrame(buffer) {
    // 1. Find the 'TZ' start marker
    let frameStart = -1;
    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i] === 0x54 && buffer[i + 1] === 0x5a) {
        frameStart = i;
        break;
      }
    }

    if (frameStart === -1) {
      // No 'TZ' found. Keeping potentially trailing 'T' for the next chunk
      if (buffer.length > 0 && buffer[buffer.length - 1] === 0x54) {
        return { frame: null, remaining: buffer.slice(buffer.length - 1) };
      }
      return { frame: null, remaining: Buffer.alloc(0) };
    }

    // Discard garbage before 'TZ'
    if (frameStart > 0) {
      buffer = buffer.slice(frameStart);
    }

    // Need at least 4 bytes to read length (TZ + 2-byte length)
    if (buffer.length < 4) {
      return { frame: null, remaining: buffer };
    }

    const packetLen = (buffer[2] << 8) | buffer[3];
    const expectedTotalLen = 2 + 2 + packetLen + 2;

    // Sanity check length to prevent huge buffers on corrupted data
    if (expectedTotalLen > 512 || expectedTotalLen < 8) {
      // Invalid length, likely false 'TZ' match or corruption. Skip this 'T' and retry.
      return { frame: null, remaining: buffer.slice(1) };
    }

    if (buffer.length >= expectedTotalLen) {
      const frame = buffer.slice(0, expectedTotalLen);
      const remaining = buffer.slice(expectedTotalLen);
      return { frame, remaining };
    }

    // Not enough data yet, wait for more
    return { frame: null, remaining: buffer };
  }

  /**
   * Handle incoming hex data from device
   * @param {net.Socket} socket - Client socket
   * @param {Buffer} data - Raw hex data
   */
  async handleIncomingData(socket, data) {
    try {
      // Append to existing buffer
      let buffer = this.clientBuffers.get(socket) || Buffer.alloc(0);
      buffer = Buffer.concat([buffer, data]);

      const chunkHex = data.toString("hex").toUpperCase();
      console.log(
        `[TCP] Received chunk: ${data.length} bytes | HEX: ${chunkHex}`,
      );
      console.log(`[TCP] Total buffer size is now: ${buffer.length} bytes`);

      // Check if the accumulated buffer starts with a known non-IoT packet type
      if (buffer.length >= 2 && (buffer[0] !== 0x54 || buffer[1] !== 0x5a)) {
        // Check if it's a known non-WF501 packet type we can identify
        if (buffer[0] === 0x16 && buffer[1] === 0x03) {
          console.log("[TCP] Ignored: TLS/SSL handshake packet");
          this.clientBuffers.set(socket, Buffer.alloc(0));
          return;
        }
        if (buffer[0] === 0x15 && buffer[1] === 0x03) {
          console.log("[TCP] Ignored: TLS alert packet");
          this.clientBuffers.set(socket, Buffer.alloc(0));
          return;
        }
        if (buffer.toString("hex", 0, 3).toUpperCase() === "474554") {
          // "GET" in hex
          console.log("[TCP] Ignored: HTTP GET request");
          this.clientBuffers.set(socket, Buffer.alloc(0));
          return;
        }
        // In other cases, we will just pass it to extractOneFrame which will
        // discard leading garbage to sync to the next 'TZ'.
      }

      // Process all complete frames in buffer
      while (true) {
        const result = this.extractOneFrame(buffer);

        if (!result.frame) {
          // No complete frame found
          this.clientBuffers.set(socket, result.remaining);
          break;
        }

        buffer = result.remaining;
        const frame = result.frame;

        // Validate and parse the WF501 frame
        if (!isValidWf501Frame(frame)) {
          console.log("[TCP] Skipping invalid frame");
          continue;
        }

        const parseResult = parseWf501Packet(frame);

        if (!parseResult.success) {
          console.error("[TCP] Parse error:", parseResult.error);
          continue;
        }

        const packet = parseResult.packet;
        console.log("[TCP] Parsed WF501 packet:", {
          imei: packet.imei,
          temperature: packet.temperatureC,
          humidity: packet.humidityRh,
          voltage: packet.batteryVolts,
          battery: `${packet.batteryPercent}%`,
          rtc: packet.rtcUtc.toISOString(),
          packetIndex: packet.packetIndex,
        });

        // Fetch device with calibration, thresholds, user (for webhookUrl), and
        // its most recent reading (used to decide whether this new value is
        // "different enough" to be worth storing — see reading-thinning below).
        const device = await prisma.device.findUnique({
          where: { imei: packet.imei },
          include: {
            user: true,
            readings: { orderBy: { timestamp: "desc" }, take: 1 },
          },
        });

        if (!device) {
          console.error(`[TCP] Unauthorized device with IMEI: ${packet.imei}`);
          continue;
        }

        if (!device.isActive) {
          console.error(`[TCP] Inactive device with IMEI: ${packet.imei}`);
          continue;
        }

        console.log(`[TCP] Device verified: ${device.name || device.imei}`);

        // Remember which device owns this socket so we can flag it offline the
        // instant the connection drops (see handleDisconnect).
        this.socketImei.set(socket, device.imei);

        // A fresh packet means the device is back online — clear any stale
        // offline flag and notify CaterFlow so its card flips green immediately.
        if (device.isOffline) {
          await prisma.device
            .update({ where: { imei: device.imei }, data: { isOffline: false } })
            .catch(() => {});
          if (device.source === "CATERFLOW") {
            sendCaterflowStatusWebhook(device.imei, true).catch(() => {});
          }
        }

        // Apply calibration: finalTemperature = raw + offset
        const rawTemp = packet.temperatureC ?? 0;
        const calibrationOffset = device.calibrationOffset ?? 0;
        const finalTemperature = rawTemp + calibrationOffset;

        // ── Temperature alert state ──────────────────────────────────────────
        const minTemp = device.minTemp ?? null;
        const maxTemp = device.maxTemp ?? null;

        let newTempState = "NORMAL";
        if (maxTemp != null && finalTemperature > maxTemp) {
          newTempState = "TEMPERATURE_HIGH";
        } else if (minTemp != null && finalTemperature < minTemp) {
          newTempState = "TEMPERATURE_LOW";
        }

        // ── Battery alert state ──────────────────────────────────────────────
        const batteryPct =
          packet.batteryPercent != null ? Number(packet.batteryPercent) : null;
        let newBatteryState = "NORMAL";
        if (batteryPct != null) {
          if (batteryPct < 10) {
            newBatteryState = "BATTERY_CRITICAL";
          } else if (batteryPct < 20) {
            newBatteryState = "BATTERY_LOW";
          }
        }

        // Update device status: online, battery level, alert states, and
        // lastSeenAt (bumped on every valid packet regardless of whether a
        // Reading row is stored below — this is what offlineChecker relies on,
        // so thinning near-duplicate readings can never make a live device
        // look stale/offline).
        await prisma.device.update({
          where: { imei: packet.imei },
          data: {
            isOffline: false,
            lastSeenAt: new Date(),
            batteryLevel: batteryPct,
            lastAlertStatus: newTempState,
            lastBatteryStatus: newBatteryState,
          },
        });

        // ── Reading storage thinning ──────────────────────────────────────────
        // Only persist a new Reading row when the temperature differs from the
        // last stored reading by at least READING_CHANGE_THRESHOLD_C (avoids
        // filling history/charts with noise like 27.2 vs 27.3). The live
        // dashboard, Socket.io broadcast, and CaterFlow webhook always use the
        // current live value below regardless of this decision.
        const lastReading = device.readings?.[0] ?? null;
        const isSignificantChange =
          !lastReading ||
          Math.abs(finalTemperature - lastReading.temperature) >=
            READING_CHANGE_THRESHOLD_C;

        let readingRecord;
        if (isSignificantChange) {
          readingRecord = await prisma.reading.create({
            data: {
              deviceImei: packet.imei,
              temperature: finalTemperature,
              humidity: packet.humidityRh ?? undefined,
              voltage: packet.batteryVolts ?? undefined,
              packetIndex: packet.packetIndex ?? undefined,
            },
          });
          console.log("[TCP] Reading saved to database");
        } else {
          // Not stored — synthesize the same shape so downstream consumers
          // (Socket.io broadcast, CaterFlow webhook, generic webhookUrl) still
          // get the current live value.
          readingRecord = {
            id: null,
            deviceImei: packet.imei,
            temperature: finalTemperature,
            humidity: packet.humidityRh ?? null,
            voltage: packet.batteryVolts ?? null,
            packetIndex: packet.packetIndex ?? null,
            timestamp: new Date(),
          };
          console.log(
            `[TCP] Reading skipped (Δ<${READING_CHANGE_THRESHOLD_C}°C) — not stored`,
          );
        }

        // ── Socket.io: broadcast live reading to TempFlow dashboard ─────────
        // `alertStatus` reflects the CURRENT evaluated state for this exact
        // packet (not just on transitions), so consumers can keep showing an
        // ongoing HIGH/LOW state correctly on every reading instead of only
        // reacting to the (much rarer) temperature_alert transition event.
        const socketPayload = {
          imei: device.imei,
          name: device.name ?? device.imei,
          temperature: finalTemperature,
          humidity: packet.humidityRh ?? null,
          battery: packet.batteryPercent != null ? `${packet.batteryPercent}%` : null,
          batteryLevel: packet.batteryPercent ?? null,
          voltage: packet.batteryVolts ?? null,
          alertStatus: newTempState,
          timestamp: readingRecord.timestamp.toISOString(),
        };
        const io = getIO();
        if (io) {
          io.emit("device_reading", socketPayload);
          console.log(`[Socket.io] Broadcasted device_reading for ${device.imei}`);
        }
        // ─────────────────────────────────────────────────────────────────────

        // ── CaterFlow Reading Webhook (real-time data) ─────────────────────
        if (device.source === "CATERFLOW") {
          sendCaterflowReadingWebhook({
            imei: device.imei,
            externalRefId: device.externalRefId,
            temperature: finalTemperature,
            humidity: packet.humidityRh,
            battery: `${packet.batteryPercent}%`,
            timestamp: readingRecord.timestamp.toISOString(),
            alertStatus: newTempState,
          }).catch((err) => {
            console.warn("[TCP] CaterFlow reading webhook error:", err.message);
          });
        }


        // ── Alert evaluation (state-transition: only fire on change) ─────────
        const createdAlerts = [];

        // Temperature: fire only when state changes
        if (newTempState !== device.lastAlertStatus) {
          if (newTempState === "TEMPERATURE_HIGH") {
            const message = `Temperature above maximum (${finalTemperature}°C > ${maxTemp}°C)`;
            const alert = await prisma.alertLog.create({
              data: {
                deviceImei: packet.imei,
                alertType: "TEMPERATURE_HIGH",
                message,
                resolved: false,
              },
            });
            createdAlerts.push(alert);
            console.log("[TCP] Alert created: TEMPERATURE_HIGH");
          } else if (newTempState === "TEMPERATURE_LOW") {
            const message = `Temperature below minimum (${finalTemperature}°C < ${minTemp}°C)`;
            const alert = await prisma.alertLog.create({
              data: {
                deviceImei: packet.imei,
                alertType: "TEMPERATURE_LOW",
                message,
                resolved: false,
              },
            });
            createdAlerts.push(alert);
            console.log("[TCP] Alert created: TEMPERATURE_LOW");
          } else if (
            device.lastAlertStatus === "TEMPERATURE_HIGH" ||
            device.lastAlertStatus === "TEMPERATURE_LOW"
          ) {
            // Recovered — notify once, and close out the open alert(s) so
            // "unresolved alerts" counts (e.g. superAdmin dashboard) don't
            // grow forever for a condition that's no longer true.
            const recoveredFromHigh = device.lastAlertStatus === "TEMPERATURE_HIGH";
            const message = recoveredFromHigh
              ? `Temperature back to normal range (${finalTemperature}°C ≤ ${maxTemp}°C)`
              : `Temperature back to normal range (${finalTemperature}°C ≥ ${minTemp}°C)`;

            await prisma.alertLog.updateMany({
              where: {
                deviceImei: packet.imei,
                alertType: device.lastAlertStatus,
                resolved: false,
              },
              data: { resolved: true },
            });

            const alert = await prisma.alertLog.create({
              data: {
                deviceImei: packet.imei,
                alertType: "TEMPERATURE_NORMAL",
                message,
                resolved: true,
              },
            });
            createdAlerts.push(alert);
            console.log(
              `[TCP] Alert created: TEMPERATURE_NORMAL (recovered from ${device.lastAlertStatus})`,
            );
          }
        }

        // Battery: fire only when state changes and not NORMAL
        if (
          newBatteryState !== device.lastBatteryStatus &&
          newBatteryState !== "NORMAL"
        ) {
          if (newBatteryState === "BATTERY_CRITICAL") {
            const message = `Battery critical (${batteryPct}%)`;
            const alert = await prisma.alertLog.create({
              data: {
                deviceImei: packet.imei,
                alertType: "BATTERY_CRITICAL",
                message,
                resolved: false,
              },
            });
            createdAlerts.push(alert);
            console.log("[TCP] Alert created: BATTERY_CRITICAL");
          } else if (newBatteryState === "BATTERY_LOW") {
            const message = `Battery low (${batteryPct}%)`;
            const alert = await prisma.alertLog.create({
              data: {
                deviceImei: packet.imei,
                alertType: "BATTERY_LOW",
                message,
                resolved: false,
              },
            });
            createdAlerts.push(alert);
            console.log("[TCP] Alert created: BATTERY_LOW");
          }
        }

        // Notify user via email/WhatsApp when alerts were created (fire-and-forget)
        if (createdAlerts.length > 0 && device.user) {
          const deviceLabel = device.name || device.imei;
          const alertSummary = createdAlerts.map((a) => a.message).join("; ");
          // Use a calmer prefix for pure recovery notifications so a "back to
          // normal" message doesn't read like a new alarm.
          const isOnlyRecovery = createdAlerts.every(
            (a) => a.alertType === "TEMPERATURE_NORMAL",
          );
          const alertMessage = isOnlyRecovery
            ? `✅ نظام التنبيهات | Device [${deviceLabel}] is back to normal: Temperature is ${finalTemperature}°C. ${alertSummary}`
            : `🚨 نظام التنبيهات | Alert for Device [${deviceLabel}]: Temperature reached ${finalTemperature}°C. ${alertSummary}`;

          if (device.user.alertEmailEnabled && device.user.alertEmail) {
            sendEmailAlert(
              device.user.alertEmail,
              isOnlyRecovery ? `IoT Recovered: ${deviceLabel}` : `IoT Alert: ${deviceLabel}`,
              alertMessage,
            ).catch((err) => {
              console.warn(
                "[TCP] Email alert error (non-fatal):",
                err?.message,
              );
            });
          }
          if (device.user.alertWhatsAppEnabled && device.user.alertWhatsApp) {
            sendWhatsAppAlert(device.user.alertWhatsApp, alertMessage).catch(
              (err) => {
                console.warn(
                  "[TCP] WhatsApp alert error (non-fatal):",
                  err?.message,
                );
              },
            );
          }
        }

        // ── CaterFlow Integration (real-time webhook) ───────────────────────
        if (createdAlerts.length > 0 && device.source === "CATERFLOW") {
          createdAlerts.forEach((alert) => {
            // Only temperature alerts map to a min/max threshold; battery
            // alerts don't apply here (threshold stays undefined for those).
            let threshold;
            let wireAlertType = alert.alertType;
            if (alert.alertType === "TEMPERATURE_HIGH") {
              threshold = device.maxTemp;
            } else if (alert.alertType === "TEMPERATURE_LOW") {
              threshold = device.minTemp;
            } else if (alert.alertType === "TEMPERATURE_NORMAL") {
              // Recovery — CaterFlow's UI matches the exact string "NORMAL"
              // (see lastAlertStatus default), not "TEMPERATURE_NORMAL".
              wireAlertType = "NORMAL";
              threshold =
                device.lastAlertStatus === "TEMPERATURE_HIGH"
                  ? device.maxTemp
                  : device.minTemp;
            }

            sendCaterflowWebhook({
              imei: device.imei,
              externalRefId: device.externalRefId,
              alertType: wireAlertType,
              currentValue: finalTemperature,
              threshold: threshold,
              timestamp: alert.timestamp.toISOString(),
            }).catch((err) => {
              console.warn("[TCP] CaterFlow webhook fire-and-forget error:", err.message);
            });
          });
        }

        // Send ACK immediately (do not wait for webhook)
        const serial = packet.packetIndex.toString().padStart(4, "0");
        this.sendAckResponse(socket, serial);

        // Fire-and-forget webhook: do not crash server or delay ACK
        const webhookUrl = device.user?.webhookUrl;
        if (webhookUrl) {
          const payload = {
            reading: {
              id: readingRecord.id,
              deviceImei: readingRecord.deviceImei,
              temperature: readingRecord.temperature,
              humidity: readingRecord.humidity ?? undefined,
              voltage: readingRecord.voltage ?? undefined,
              packetIndex: readingRecord.packetIndex ?? undefined,
              timestamp: readingRecord.timestamp.toISOString(),
            },
            alerts: createdAlerts.map((a) => ({
              id: a.id,
              alertType: a.alertType,
              message: a.message,
              timestamp: a.timestamp.toISOString(),
              resolved: a.resolved,
            })),
          };
          sendWebhook(webhookUrl, payload).catch((err) => {
            console.warn("[TCP] Webhook error (non-fatal):", err?.message);
          });
        }
      }
    } catch (error) {
      console.error("[TCP] Error processing data:", error);
    }
  }

  /**
   * Send ACK response to device
   * Format: @ACK,xxxx# where xxxx is the packet index (4-digit decimal)
   * @param {net.Socket} socket - Client socket
   * @param {string} serial - Packet serial number
   */
  sendAckResponse(socket, serial) {
    if (!serial) {
      console.error("[TCP] Cannot send ACK: serial is null");
      return;
    }

    const ackMessage = `@ACK,${serial}#`;

    socket.write(ackMessage, (err) => {
      if (err) {
        console.error("[TCP] Error sending ACK:", err);
      } else {
        console.log("[TCP] ACK sent:", ackMessage);
      }
    });
  }

  /**
   * Stop TCP server
   */
  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log("[TCP] Server stopped");
      });
    }
  }
}

export default TCPServer;
