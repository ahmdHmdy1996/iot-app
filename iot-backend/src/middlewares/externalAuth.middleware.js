import prisma from "../config/db.js";

/**
 * Middleware: authenticate External API via Authorization: Bearer <apiKey>
 * Verifies token against User.apiKey, attaches user to req.user. Returns 401 if invalid.
 */
export async function authenticateExternalApi(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid Authorization header. Use: Bearer <token>",
      });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Missing API token" });
    }

    const user = await prisma.user.findFirst({
      where: { apiKey: token },
    });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid API token" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("External API auth error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
