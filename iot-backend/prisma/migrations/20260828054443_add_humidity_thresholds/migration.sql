-- CreateEnum
CREATE TYPE "HumidityAlertStatus" AS ENUM ('NORMAL', 'HUMIDITY_HIGH', 'HUMIDITY_LOW');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AlertType" ADD VALUE 'HUMIDITY_HIGH';
ALTER TYPE "AlertType" ADD VALUE 'HUMIDITY_LOW';
ALTER TYPE "AlertType" ADD VALUE 'HUMIDITY_NORMAL';

-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "lastHumidityStatus" "HumidityAlertStatus" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "maxHumidity" DOUBLE PRECISION,
ADD COLUMN     "minHumidity" DOUBLE PRECISION;
