/**
 * Prisma Seed Script - Admin User Setup
 *
 * This script creates/updates the admin user in the database.
 * Run with: npx prisma db seed
 *
 * It ensures the admin user exists with a BCrypt-hashed password.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Seed Admin User
  const adminUsername = "admin";
  const adminPassword = "123456"; // Fixed password as requested

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  const adminUser = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      // Optional: Update password on seed if you want to reset it every time
      // password: hashedPassword
    },
    create: {
      username: adminUsername,
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log(
    `✅ Admin user verified: ${adminUser.username} (Role: ${adminUser.role})`,
  );

  // 2. Seed Test Devices (Optional, keeping existing logic)
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
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
