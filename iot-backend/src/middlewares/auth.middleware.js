import jwt from "jsonwebtoken";
import prisma from "../config/db.js";

/**
 * Dual Auth Middleware
 * 1. If x-api-key header is present → authenticate via User.apiKey (service-to-service)
 * 2. Otherwise → fallback to Bearer <token> JWT logic
 * 3. If neither is valid → 401 Unauthorized
 */
export async function authMiddleware(req, res, next) {
  // ── Strategy 1: API Key (service-to-service, e.g. Caterflow) ──
  const apiKey = req.headers["x-api-key"];
  if (apiKey) {
    try {
      const user = await prisma.user.findUnique({
        where: { apiKey },
      });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid API key.",
        });
      }
      // Attach full user object (id, username, role, etc.)
      req.user = {
        id: user.id,
        username: user.username,
        role: user.role,
      };
      return next();
    } catch (error) {
      console.error("API Key auth error:", error);
      return res.status(500).json({
        success: false,
        message: "Server error during API key authentication.",
      });
    }
  }

  // ── Strategy 2: JWT Bearer token ──
  const authHeader = req.headers.authorization;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error("Auth middleware: JWT_SECRET not set");
    return res.status(500).json({
      success: false,
      message: "Server authentication not configured.",
    });
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized. Please log in or provide a valid API key.",
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded; // { id, username, role, ... }
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid. Please log in again.",
    });
  }
}

/**
 * Role Authorization Middleware
 * @param {string[]} roles - Array of allowed roles (e.g., ["ADMIN", "CLIENT"])
 */
export function authorizeRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Forbidden: You do not have permission to access this resource.",
      });
    }

    next();
  };
}

/**
 * Super Admin Only Middleware
 * Restricts access to SUPER_ADMIN role only.
 */
export function superAdminOnly(req, res, next) {
  if (req.user?.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Super Admin only.",
    });
  }
  next();
}
