const { PrismaClient } = require("@prisma/client");

// Single shared PrismaClient instance for the entire project.
// The client connects lazily on first query — no eager $connect() call here —
// so a slow or temporarily unavailable database will not crash the process at
// startup. Connection errors are surfaced per-request instead.
let prisma;

try {
  prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
  });

  // Attach a top-level handler so unhandled Prisma engine errors are logged
  // rather than silently killing the process.
  prisma.$on("error", (e) => {
    console.error("[Prisma] Client error:", e);
  });
} catch (err) {
  console.error("[Prisma] Failed to instantiate PrismaClient:", err.message);
  // Export a minimal stub so callers receive a clear runtime error instead of
  // a cryptic "Cannot read properties of undefined" crash.
  prisma = new Proxy(
    {},
    {
      get(_, prop) {
        return () => {
          throw new Error(
            `[Prisma] Client failed to initialise. Original error: ${err.message}`
          );
        };
      },
    }
  );
}

module.exports = prisma;
