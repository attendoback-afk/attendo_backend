const { PrismaClient } = require("@prisma/client");

// نعمل instance واحدة بس من Prisma في كل المشروع
const prisma = new PrismaClient();

module.exports = prisma;
