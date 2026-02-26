import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

/**
 * Prisma singleton to prevent multiple instances in development (e.g. hot reload)
 * and avoid "Too many connections" warnings.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
