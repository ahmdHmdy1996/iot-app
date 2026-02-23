import net from "net";
import moment from "moment";
import prisma from "../prisma.js";
import { parseWf501Packet, isValidWf501Frame } from "./HexParser.js";

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
      console.log(`[TCP] Server listening on port ${this.port}`);
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

        // Verify device exists in database
        const device = await prisma.device.findUnique({
          where: { imei: packet.imei },
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

        // Save reading to database
        await prisma.reading.create({
          data: {
            deviceImei: packet.imei,
            temperature: packet.temperatureC ?? 0,
            humidity: packet.humidityRh ?? undefined,
            voltage: packet.batteryVolts ?? undefined,
            packetIndex: packet.packetIndex ?? undefined,
          },
        });
        console.log("[TCP] Reading saved to database");

        // Send ACK response - format packet index as 4-digit string
        const serial = packet.packetIndex.toString().padStart(4, "0");
        this.sendAckResponse(socket, serial);
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
