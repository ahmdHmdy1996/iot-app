import net from "net";
import moment from "moment";
import prisma from "../config/db.js";
import { parseWf501Packet, isValidWf501Frame } from "./HexParser.js";
import { sendWebhook } from "../utils/webhook.js";
import { sendEmailAlert, sendWhatsAppAlert } from "../utils/notifications.js";

/**
 * TCP Server for WF501 IoT Devices
 * Handles device connections, data parsing, and ACK responses
 */
class TCPServer {
  constructor(port) {
    this.port = port;
    this.server = null;
    this.clientBuffers = new Map(); // Store buffers per client socket
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
        this.clientBuffers.delete(socket);
      });

      // Handle disconnection
      socket.on("close", () => {
        console.log(`[TCP] Device disconnected: ${clientId}`);
        this.clientBuffers.delete(socket);
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

        // Fetch device with calibration, thresholds, and user (for webhookUrl)
        const device = await prisma.device.findUnique({
          where: { imei: packet.imei },
          include: { user: true },
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

        // Update device status: online, battery level, and alert states
        await prisma.device.update({
          where: { imei: packet.imei },
          data: {
            isOffline: false,
            batteryLevel: batteryPct,
            lastAlertStatus: newTempState,
            lastBatteryStatus: newBatteryState,
          },
        });

        // Save reading with calibrated temperature
        const readingRecord = await prisma.reading.create({
          data: {
            deviceImei: packet.imei,
            temperature: finalTemperature,
            humidity: packet.humidityRh ?? undefined,
            voltage: packet.batteryVolts ?? undefined,
            packetIndex: packet.packetIndex ?? undefined,
          },
        });
        console.log("[TCP] Reading saved to database");

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
          }
          // NORMAL: state was reset – no alert needed, just status updated
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
          const alertMessage = `🚨 نظام التنبيهات | Alert for Device [${deviceLabel}]: Temperature reached ${finalTemperature}°C. ${alertSummary}`;

          if (device.user.alertEmailEnabled && device.user.alertEmail) {
            sendEmailAlert(
              device.user.alertEmail,
              `IoT Alert: ${deviceLabel}`,
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
