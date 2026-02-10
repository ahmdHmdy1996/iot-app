import jwt from "jsonwebtoken";

/**
 * JWT Auth Middleware
 * Expects header: Authorization: Bearer <token>
 * Verifies token with JWT_SECRET; on failure returns 401.
 */
export function authMiddleware(req, res, next) {
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
      message: "Unauthorized. Please log in.",
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
