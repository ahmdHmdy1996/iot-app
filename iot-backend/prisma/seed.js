/**
 * Prisma Seed Script - Multi-Tenant Setup
 *
 * This script creates:
 * 1. Admin User (admin/123456)
 * 2. Client User (client/123456)
 * 3. Two Devices (one assigned to client, one unassigned)
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create Users
  const password = await bcrypt.hash("123456", 10);

  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: { role: "ADMIN" },
    create: {
      username: "admin",
      password: password,
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin user: ${adminUser.username}`);

  const clientUser = await prisma.user.upsert({
    where: { username: "client" },
    update: { role: "CLIENT" },
    create: {
      username: "client",
      password: password,
      role: "CLIENT",
    },
  });
  console.log(`✅ Client user: ${clientUser.username}`);

  // CaterFlow Master Account — unlimited devices for B2B integration
  const caterflowPassword = await bcrypt.hash("caterflow_master_2026!", 10);
  const caterflowMaster = await prisma.user.upsert({
    where: { username: "caterflow_master" },
    update: { maxDevices: 99999, apiKey: "caterflow_master_api_key_b2b_2026" },
    create: {
      username: "caterflow_master",
      password: caterflowPassword,
      role: "CLIENT",
      maxDevices: 99999,
      apiKey: "caterflow_master_api_key_b2b_2026",
    },
  });
  console.log(`✅ CaterFlow Master account: ${caterflowMaster.username} (maxDevices: ${caterflowMaster.maxDevices})`);

  // 2. Create Devices
  const device1 = await prisma.device.upsert({
    where: { imei: "DEVICE_001" },
    update: { userId: clientUser.id }, // Assign to client
    create: {
      imei: "DEVICE_001",
      name: "Client's Sensor",
      isActive: true,
      userId: clientUser.id,
    },
  });
  console.log(`✅ Device 1 (Assigned to Client): ${device1.imei}`);

  const device2 = await prisma.device.upsert({
    where: { imei: "DEVICE_002" },
    update: { userId: null }, // Ensure unassigned
    create: {
      imei: "DEVICE_002",
      name: "Unassigned Inventory",
      isActive: true,
      userId: null,
    },
  });
  console.log(`✅ Device 2 (Unassigned): ${device2.imei}`);

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
