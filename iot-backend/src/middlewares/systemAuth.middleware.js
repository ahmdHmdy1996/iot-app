import jwt from "jsonwebtoken";
import { authMiddleware } from "./auth.middleware.js";

/**
 * Middleware for strict system-to-system authentication using the master SYSTEM_API_KEY.
 * Only accepts requests with a valid x-api-key matching the environment variable.
 */
export const systemAuthMiddleware = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const systemKey = process.env.SYSTEM_API_KEY;

  if (!systemKey) {
    console.warn("[AUTH] SYSTEM_API_KEY is not set in environment variables");
    return res.status(500).json({
      success: false,
      message: "Server configuration error: SYSTEM_API_KEY missing",
    });
  }

  if (!apiKey || apiKey !== systemKey) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or missing System API Key",
    });
  }

  req.isSystemAuth = true;
  next();
};

/**
 * Hybrid Auth Middleware: Allows either a valid User (JWT/User API Key)
 * OR a valid System Master API Key.
 */
export const hybridAuthMiddleware = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const systemKey = process.env.SYSTEM_API_KEY;

  // 1. Check if it's the Master System Key
  if (systemKey && apiKey === systemKey) {
    req.isSystemAuth = true;
    return next();
  }

  // 2. Otherwise, fall back to the standard User Authentication (JWT or User-specific API Key)
  return authMiddleware(req, res, next);
};
