import { Server } from "socket.io";

/** @type {import("socket.io").Server | null} */
let io = null;

/**
 * Initialise the Socket.io server and attach it to an existing HTTP server.
 * Must be called once during application startup (server.js).
 *
 * @param {import("http").Server} httpServer
 * @returns {import("socket.io").Server}
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected:    ${socket.id}`);
    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  console.log("[Socket.io] Server initialised and ready.");
  return io;
}

/**
 * Return the shared Socket.io instance.
 * Safe to call from anywhere — returns null (instead of throwing) if not yet
 * initialised, so callers can guard without a try/catch.
 *
 * @returns {import("socket.io").Server | null}
 */
export function getIO() {
  return io;
}
