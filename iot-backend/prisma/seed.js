/**
 * Prisma Seed Script - Admin User Setup
 *
 * This script creates/updates the admin user in the database.
 * Run with: npx prisma db seed
 *
 * Note: Current auth uses plain-text comparison from .env variables.
 * This seed adds an Admin model for future database-backed auth.
 */

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

/**
 * Simple password hashing using Node.js crypto (no external deps needed)
 * For production, consider using bcrypt or argon2
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  console.log("🌱 Seeding database...");

  // Seed some test devices
  const devices = [
    {
      imei: "TEST001",
      name: "Test Temperature Sensor 1",
      isActive: true,
    },
    {
      imei: "TEST002",
      name: "Test Temperature Sensor 2",
      isActive: true,
    },
  ];

  for (const device of devices) {
    const result = await prisma.device.upsert({
      where: { imei: device.imei },
      update: { name: device.name, isActive: device.isActive },
      create: device,
    });
    console.log(`✅ Device upserted: ${result.imei} - ${result.name}`);
  }

  console.log("✅ Seeding complete!");
  console.log("");
  console.log("📝 Admin credentials are managed via .env file:");
  console.log("   ADMIN_USERNAME=admin");
  console.log("   ADMIN_PASSWORD=diboo22");
  console.log("   JWT_SECRET=your-long-random-jwt-secret");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
