import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton. Next.js dev mode hot-reloads server modules,
 * which would otherwise spin up a fresh PrismaClient (and a fresh
 * connection pool) on every edit. Stashing it on `globalThis` in
 * development avoids exhausting the Postgres connection limit.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
