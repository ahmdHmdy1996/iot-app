import dotenv from "dotenv";
import app from "./app.js";
import prisma from "./prisma.js";
import TCPServer from "./tcp/TCPServer.js";

// Load environment variables
dotenv.config();

const HTTP_PORT = process.env.HTTP_PORT || 3000;
const TCP_PORT = process.env.TCP_PORT || 8899;

/**
 * Start application
 */
async function startServer() {
  try {
    // Connect to PostgreSQL (Prisma)
    await prisma.$connect();
    console.log("[Prisma] Connected to PostgreSQL");

    // Start HTTP server
    app.listen(HTTP_PORT, () => {
      console.log("=".repeat(50));
      console.log("🚀 IoT Temperature Monitoring Backend");
      console.log("=".repeat(50));
      console.log(`📡 HTTP API Server running on port ${HTTP_PORT}`);
      console.log(`🌐 Health check: http://localhost:${HTTP_PORT}/health`);
      console.log("=".repeat(50));
    });

    // Start TCP server for devices
    const tcpServer = new TCPServer(TCP_PORT);
    tcpServer.start();

    // Graceful shutdown
    const shutdown = async () => {
      console.log("\n\n[Server] Shutting down gracefully...");
      tcpServer.stop();
      await prisma.$disconnect();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
