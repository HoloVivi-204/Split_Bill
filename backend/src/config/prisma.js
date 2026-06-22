const { PrismaClient } = require("@prisma/client");

const globalForPrisma = global;

const prisma =
  globalForPrisma.__splitbillPrisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__splitbillPrisma = prisma;
}

module.exports = prisma;
