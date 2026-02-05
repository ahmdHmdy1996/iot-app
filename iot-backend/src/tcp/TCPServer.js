import net from "net";
import moment from "moment";
import prisma from "../prisma.js";
import { parseHexPacket } from "./HexParser.js";

/**
 * TCP Server for WF501 IoT Devices
 * Handles device connections, data parsing, and ACK responses
 */
class TCPServer {
  constructor(port) {
    this.port = port;
    this.server = null;
  }

  /**
   * Start TCP server
   */
  start() {
    this.server = net.createServer((socket) => {
      console.log(
        `[TCP] New device connected: ${socket.remoteAddress}:${socket.remotePort}`,
      );

      // Send sync message immediately on connection
      this.sendSyncMessage(socket);

      // Handle incoming data
      socket.on("data", async (data) => {
        await this.handleIncomingData(socket, data);
      });

      // Handle connection errors
      socket.on("error", (error) => {
        console.error("[TCP] Socket error:", error.message);
      });

      // Handle disconnection
      socket.on("close", () => {
        console.log(
          `[TCP] Device disconnected: ${socket.remoteAddress}:${socket.remotePort}`,
        );
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
    const currentTime = moment().format("YYYY-MM-DD HH:mm:ss");
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
   * Handle incoming hex data from device
   * @param {net.Socket} socket - Client socket
   * @param {Buffer} data - Raw hex data
   */
  async handleIncomingData(socket, data) {
    try {
      console.log("[TCP] Received data (hex):", data.toString("hex"));
      console.log("[TCP] Received data (length):", data.length, "bytes");

      // Parse hex packet
      const parsedData = parseHexPacket(data);

      if (!parsedData.imei) {
        console.error("[TCP] Failed to extract IMEI from packet");
        return;
      }

      console.log("[TCP] Parsed data:", parsedData);

      // Verify device exists in database
      const device = await prisma.device.findUnique({
        where: { imei: parsedData.imei },
      });

      if (!device) {
        console.error(
          `[TCP] Unauthorized device with IMEI: ${parsedData.imei}`,
        );
        return;
      }

      if (!device.isActive) {
        console.error(`[TCP] Inactive device with IMEI: ${parsedData.imei}`);
        return;
      }

      console.log(`[TCP] Device verified: ${device.name || device.imei}`);

      // Save reading to database (temperature required; use 0 if parser returned null)
      await prisma.reading.create({
        data: {
          deviceImei: parsedData.imei,
          temperature: parsedData.temperature ?? 0,
          humidity: parsedData.humidity ?? undefined,
          voltage: parsedData.voltage ?? undefined,
          packetIndex: parsedData.packetIndex ?? undefined,
        },
      });
      console.log("[TCP] Reading saved to database");

      // Send ACK response
      this.sendAckResponse(socket, parsedData.packetIndex);
    } catch (error) {
      console.error("[TCP] Error processing data:", error);
    }
  }

  /**
   * Send ACK response to device
   * Format: @ACK,xxxx# where xxxx is the packet index
   * @param {net.Socket} socket - Client socket
   * @param {number} packetIndex - Packet sequence number
   */
  sendAckResponse(socket, packetIndex) {
    if (packetIndex === null || packetIndex === undefined) {
      console.error("[TCP] Cannot send ACK: packet index is null");
      return;
    }

    const ackMessage = `@ACK,${packetIndex}#`;

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
