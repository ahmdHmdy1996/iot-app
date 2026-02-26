-- CreateTable
CREATE TABLE "system_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "platformName" TEXT NOT NULL DEFAULT 'IoT Monitor Pro',
    "supportEmail" TEXT NOT NULL DEFAULT 'support@iotmonitor.com',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Riyadh',
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
