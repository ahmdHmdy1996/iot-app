import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../config/db.js";

/**
 * Login user: validate credentials and return JWT + user info.
 * @param {string} username
 * @param {string} password
 * @returns {{ token: string, user: { id, username, role } }}
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

  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    console.log(`[Auth] User not found: ${username}`);
    const err = new Error("بيانات الدخول غير صحيحة.");
    err.statusCode = 401;
    throw err;
  }
  console.log(`[Auth] 1. User found: ${user.username} (ID: ${user.id})`);

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    console.log(`[Auth] Password mismatch for user: ${username}`);
    const err = new Error("بيانات الدخول غير صحيحة.");
    err.statusCode = 401;
    throw err;
  }
  console.log(`[Auth] 2. Password match confirmed.`);

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

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}

/**
 * Register a new CLIENT user and return JWT (auto-login).
 * @param {string} username
 * @param {string} password
 * @returns {{ token: string, user: { id, username, role } }}
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

  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    const err = new Error("اسم المستخدم مسجل بالفعل.");
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role: "CLIENT",
      plan: "BASIC",
    },
  });

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: "24h" },
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}
