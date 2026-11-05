import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

function withConnectionPoolSettings(databaseUrl: string): string {
  const connectionLimit = process.env.DATABASE_CONNECTION_LIMIT || "5";
  const poolTimeout = process.env.DATABASE_POOL_TIMEOUT || "20";
  const settings = [
    !/[?&]connection_limit=/.test(databaseUrl)
      ? `connection_limit=${encodeURIComponent(connectionLimit)}`
      : "",
    !/[?&]pool_timeout=/.test(databaseUrl)
      ? `pool_timeout=${encodeURIComponent(poolTimeout)}`
      : "",
  ].filter(Boolean);

  if (settings.length === 0) return databaseUrl;

  const separator = databaseUrl.includes("?") ? "&" : "?";
  return `${databaseUrl}${separator}${settings.join("&")}`;
}

const databaseUrl = process.env.DATABASE_URL;

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    ...(databaseUrl
      ? { datasources: { db: { url: withConnectionPoolSettings(databaseUrl) } } }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
