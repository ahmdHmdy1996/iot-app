import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

/**
 * POST /auth/login
 * Validate admin credentials and return JWT
 * Body: { username, password }
 */
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!adminUsername || !adminPassword || !jwtSecret) {
    console.error("Auth: ADMIN_USERNAME, ADMIN_PASSWORD, or JWT_SECRET not set");
    return res.status(500).json({
      success: false,
      message: "Server authentication not configured.",
    });
  }

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "اسم المستخدم وكلمة المرور مطلوبان.",
    });
  }

  if (username !== adminUsername || password !== adminPassword) {
    return res.status(401).json({
      success: false,
      message: "بيانات الدخول غير صحيحة.",
    });
  }

  try {
    const token = jwt.sign(
      { username: adminUsername },
      jwtSecret,
      { expiresIn: "24h" }
    );
    return res.json({
      success: true,
      token,
    });
  } catch (err) {
    console.error("JWT sign error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

export default router;
