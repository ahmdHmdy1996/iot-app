import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../config/db.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function generateTokens(user) {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret + "_refresh";

  const payload = { id: user.id, username: user.username, role: user.role };

  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: REFRESH_TOKEN_EXPIRY });

  return { accessToken, refreshToken };
}

export function setRefreshTokenCookie(res, refreshToken) {
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
    path: "/",
  });
}

/**
 * Login user: validate credentials and return access token + set refresh token cookie.
 */
export async function loginUser(username, password) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    const err = new Error("Server authentication not configured.");
    err.statusCode = 500;
    throw err;
  }

  if (!username || !password) {
    const err = new Error("اسم المستخدم وكلمة المرور مطلوبان.");
    err.statusCode = 400;
    throw err;
  }

  console.log(`[Auth] Login attempt for user: ${username}`);

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    console.log(`[Auth] User not found: ${username}`);
    const err = new Error("بيانات الدخول غير صحيحة.");
    err.statusCode = 401;
    throw err;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    console.log(`[Auth] Password mismatch for user: ${username}`);
    const err = new Error("بيانات الدخول غير صحيحة.");
    err.statusCode = 401;
    throw err;
  }

  const { accessToken, refreshToken } = generateTokens(user);
  console.log(`[Auth] Tokens generated for user: ${username}`);

  return {
    token: accessToken,
    refreshToken,
    user: { id: user.id, username: user.username, role: user.role },
  };
}

/**
 * Refresh: verify refresh token cookie and return new access token.
 */
export async function refreshAccessToken(refreshToken) {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret + "_refresh";

  if (!refreshToken) {
    const err = new Error("No refresh token provided.");
    err.statusCode = 401;
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, refreshSecret);
  } catch {
    const err = new Error("Refresh token expired or invalid. Please log in again.");
    err.statusCode = 401;
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) {
    const err = new Error("User not found.");
    err.statusCode = 401;
    throw err;
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

  return {
    token: accessToken,
    refreshToken: newRefreshToken,
    user: { id: user.id, username: user.username, role: user.role },
  };
}

/**
 * Register a new CLIENT user and return tokens.
 */
export async function registerUser(username, password) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    const err = new Error("Server authentication not configured.");
    err.statusCode = 500;
    throw err;
  }

  if (!username || !password) {
    const err = new Error("اسم المستخدم وكلمة المرور مطلوبان.");
    err.statusCode = 400;
    throw err;
  }

  if (password.length < 6) {
    const err = new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
    err.statusCode = 400;
    throw err;
  }

  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    const err = new Error("اسم المستخدم مسجل بالفعل.");
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, password: hashedPassword, role: "CLIENT", plan: "BASIC" },
  });

  const { accessToken, refreshToken } = generateTokens(user);

  return {
    token: accessToken,
    refreshToken,
    user: { id: user.id, username: user.username, role: user.role },
  };
}
