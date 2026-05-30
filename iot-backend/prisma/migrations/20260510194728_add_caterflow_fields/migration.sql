/*
  Warnings:

  - You are about to drop the column `apiToken` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[api_token]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SystemSource" AS ENUM ('DEFAULT', 'CATERFLOW');

-- DropIndex
DROP INDEX "users_apiToken_key";

-- AlterTable
ALTER TABLE "devices" ADD COLUMN     "external_ref_id" TEXT,
ADD COLUMN     "source" "SystemSource" NOT NULL DEFAULT 'DEFAULT';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "apiToken",
ADD COLUMN     "api_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_api_token_key" ON "users"("api_token");
