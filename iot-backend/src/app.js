import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import adminRoutes from "./routes/admin.js";
import apiRoutes from "./routes/api.js";
import authRoutes from "./routes/auth.js";
import externalRoutes from "./routes/external.js"; // New External Routes

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors()); // Allow all origins (temp fix for production)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes); // Middleware is applied inside the router file
app.use("/api/external", externalRoutes); // New external API path
app.use("/api", apiRoutes); // User API (protected by JWT inside router)

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

export default app;
