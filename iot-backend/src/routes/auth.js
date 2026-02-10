import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

/**
 * POST /auth/login
 * Validate admin credentials and return JWT
 * Body: { username, password }
 */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const jwtSecret = process.env.JWT_SECRET;

  console.log(`[Auth] Login attempt for user: ${username}`);

  if (!jwtSecret) {
    console.error("[Auth] CRITICAL: JWT_SECRET not set in .env");
    return res.status(500).json({
      success: false,
      message: "Server authentication not configured.",
    });
  }

  if (!username || !password) {
    console.log("[Auth] Missing username or password");
    return res.status(400).json({
      success: false,
      message: "اسم المستخدم وكلمة المرور مطلوبان.",
    });
  }

  try {
    // 1. Find user in DB
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      console.log(`[Auth] User not found: ${username}`);
      return res.status(401).json({
        success: false,
        message: "بيانات الدخول غير صحيحة.",
      });
    }
    console.log(`[Auth] 1. User found: ${user.username} (ID: ${user.id})`);

    // 2. Compare password (bcrypt)
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      console.log(`[Auth] Password mismatch for user: ${username}`);
      return res.status(401).json({
        success: false,
        message: "بيانات الدخول غير صحيحة.",
      });
    }
    console.log(`[Auth] 2. Password match confirmed.`);

    // 3. Generate Token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: "24h" },
    );
    console.log(`[Auth] 3. JWT generated successfully.`);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("[Auth] Exception during login:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

export default router;
