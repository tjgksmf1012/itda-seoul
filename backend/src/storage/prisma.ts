import { PrismaClient } from "@prisma/client";

declare global {
  var __itdaPrisma__: PrismaClient | undefined;
}

export function getPrismaClient() {
  if (!globalThis.__itdaPrisma__) {
    globalThis.__itdaPrisma__ = new PrismaClient();
  }

  return globalThis.__itdaPrisma__;
}
