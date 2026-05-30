import dotenv from "dotenv";
import app from "./app.js";
import prisma from "./config/db.js";
import TCPServer from "./tcp/TCPServer.js";
import { initSocket } from "./socket.js";
import {
  startOfflineChecker,
  stopOfflineChecker,
} from "./jobs/offlineChecker.js";

// Load environment variables
dotenv.config();

// Fatal error handlers: log and exit instead of failing silently
process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
  process.exit(1);
});

const HTTP_PORT = process.env.HTTP_PORT || 3000;
const TCP_PORT = process.env.TCP_PORT || 8899;

/**
 * Start application
 */
async function startServer() {
  try {
    // Connect to PostgreSQL (Prisma)
    await prisma.$connect();
    console.log("[DB] Prisma connected successfully.");

    // Start HTTP server and attach Socket.io to the same port
    const httpServer = app.listen(HTTP_PORT, () => {
      console.log(`[SERVER] HTTP Server running on port ${HTTP_PORT}`);
    });
    initSocket(httpServer);

    // Start TCP server for devices (logs "[TCP] TCP Server running on port X" when listening)
    const tcpServer = new TCPServer(TCP_PORT);
    tcpServer.start();

    // Start offline checker job (every 5 min)
    startOfflineChecker();

    // Graceful shutdown
    const shutdown = async () => {
      console.log("\n[Server] Shutting down gracefully...");
      stopOfflineChecker();
      tcpServer.stop();
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("[FATAL] Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
