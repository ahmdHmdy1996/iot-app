-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('NORMAL', 'TEMPERATURE_HIGH', 'TEMPERATURE_LOW');

-- CreateEnum
CREATE TYPE "BatteryAlertStatus" AS ENUM ('NORMAL', 'BATTERY_LOW', 'BATTERY_CRITICAL');

-- AlterEnum: add BATTERY_LOW and BATTERY_CRITICAL to AlertType
ALTER TYPE "AlertType" ADD VALUE 'BATTERY_LOW';
ALTER TYPE "AlertType" ADD VALUE 'BATTERY_CRITICAL';

-- AlterTable: add deduplication state columns to devices
ALTER TABLE "devices" ADD COLUMN "lastAlertStatus" "AlertStatus" NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "devices" ADD COLUMN "lastBatteryStatus" "BatteryAlertStatus" NOT NULL DEFAULT 'NORMAL';
