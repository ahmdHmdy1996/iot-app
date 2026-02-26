/*
  Warnings:

  - Added the required column `alertType` to the `alert_logs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('TEMPERATURE_HIGH', 'TEMPERATURE_LOW', 'OFFLINE');

-- AlterTable
ALTER TABLE "alert_logs" ADD COLUMN     "alertType" "AlertType" NOT NULL;
