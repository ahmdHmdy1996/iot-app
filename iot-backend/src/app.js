import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

// Route modules
import authRoutes from "./routes/auth.routes.js";
import superAdminRoutes from "./routes/superAdmin.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import deviceRoutes from "./routes/device.routes.js";
import userRoutes from "./routes/user.routes.js";
import usersRoutes from "./routes/users.routes.js";
import readingRoutes from "./routes/reading.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import auditReportRoutes from "./routes/auditReport.routes.js";
import externalRoutes from "./routes/external.routes.js";

// Controllers & middleware used for inline routes
import { getCaterflowDevices } from "./controllers/device.controller.js";
import { authMiddleware, authorizeRole } from "./middlewares/auth.middleware.js";

// Middlewares
import {
  notFoundHandler,
  globalErrorHandler,
} from "./middlewares/error.middleware.js";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logger (before all routes)
app.use((req, res, next) => {
  const url = req.originalUrl || req.url || req.path;
  const time = new Date().toISOString();
  console.log(`[HTTP] ${req.method} ${url} - ${time}`);
  next();
});

// Routes (order matters: more specific paths first)
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);      // includes /admin/caterflow-devices (ADMIN + SUPER_ADMIN)
app.use("/api/admin", superAdminRoutes);
app.use("/api/external", externalRoutes);
app.use("/api/my-devices", deviceRoutes);
app.use("/api/user", userRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/audit-report", auditReportRoutes);
app.use("/api/devices", dashboardRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date(),
  });
});

// ── CaterFlow B2B devices — ADMIN only (same as all /admin/* routes) ──
app.get(
  "/admin/caterflow-devices",
  authMiddleware,
  authorizeRole(["ADMIN"]),
  getCaterflowDevices,
);

// 404 handler
app.use(notFoundHandler);

// Global Error Handler
app.use(globalErrorHandler);

export default app;
