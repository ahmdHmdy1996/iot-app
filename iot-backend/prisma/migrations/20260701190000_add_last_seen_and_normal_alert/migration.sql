-- AlterEnum
ALTER TYPE "AlertType" ADD VALUE 'TEMPERATURE_NORMAL';

-- AlterTable
ALTER TABLE "devices" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
