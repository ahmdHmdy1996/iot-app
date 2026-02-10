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

  if (!jwtSecret) {
    console.error("Auth: JWT_SECRET not set");
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

  try {
    // 1. Find user in DB
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "بيانات الدخول غير صحيحة.",
      });
    }

    // 2. Compare password (bcrypt)
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "بيانات الدخول غير صحيحة.",
      });
    }

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
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
});

export default router;
