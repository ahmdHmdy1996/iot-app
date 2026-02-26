-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('BASIC', 'PRO');

-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "batteryLevel" DOUBLE PRECISION,
ADD COLUMN     "calibrationOffset" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isOffline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxTemp" DOUBLE PRECISION,
ADD COLUMN     "minTemp" DOUBLE PRECISION,
ADD COLUMN     "userId" INTEGER;

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan" "PlanType" NOT NULL DEFAULT 'BASIC',
    "maxDevices" INTEGER NOT NULL DEFAULT 5,
    "alertEmail" TEXT,
    "alertEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alertWhatsApp" TEXT,
    "alertWhatsAppEnabled" BOOLEAN NOT NULL DEFAULT false,
    "apiToken" TEXT,
    "webhookUrl" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_logs" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "deviceImei" TEXT NOT NULL,

    CONSTRAINT "alert_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_apiToken_key" ON "users"("apiToken");

-- CreateIndex
CREATE INDEX "alert_logs_deviceImei_timestamp_idx" ON "alert_logs"("deviceImei", "timestamp" DESC);

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_logs" ADD CONSTRAINT "alert_logs_deviceImei_fkey" FOREIGN KEY ("deviceImei") REFERENCES "devices"("imei") ON DELETE CASCADE ON UPDATE CASCADE;
