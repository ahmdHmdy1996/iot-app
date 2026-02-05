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
      message: "غير مصرح. يرجى تسجيل الدخول.",
    });
  }

  const token = authHeader.slice(7);

  try {
    jwt.verify(token, jwtSecret);
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "انتهت الجلسة أو الرمز غير صالح. يرجى تسجيل الدخول مرة أخرى.",
    });
  }
}
