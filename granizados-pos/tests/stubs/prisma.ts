// Las pruebas corren contra SQLite: es la única base que se puede levantar
// dentro del proceso, sin servidor ni red. Producción usa PostgreSQL con el
// mismo esquema; `tests/global-setup.ts` traduce el esquema y crea las tablas.
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./tests/test.db";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

globalForPrisma.prisma = prisma;
