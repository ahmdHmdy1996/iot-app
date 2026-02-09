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

  // DEBUG: Log incoming auth header
  console.log(
    "[Auth Debug] Authorization header:",
    authHeader ? `Bearer ${authHeader.slice(7, 20)}...` : "MISSING",
  );

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log(
      "[Auth Debug] FAILED: Missing or malformed Authorization header",
    );
    return res.status(401).json({
      success: false,
      message: "غير مصرح. يرجى تسجيل الدخول.",
    });
  }

  const token = authHeader.slice(7);
  console.log("[Auth Debug] Token extracted, length:", token.length);

  try {
    const decoded = jwt.verify(token, jwtSecret);
    console.log("[Auth Debug] SUCCESS: Token verified, payload:", decoded);
    req.user = decoded; // Attach decoded payload to request
    next();
  } catch (err) {
    console.log("[Auth Debug] FAILED: JWT verification error:", err.message);
    return res.status(401).json({
      success: false,
      message: "انتهت الجلسة أو الرمز غير صالح. يرجى تسجيل الدخول مرة أخرى.",
    });
  }
}
