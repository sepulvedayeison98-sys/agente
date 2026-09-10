import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` es un guardia de bundling: fuera de Next no aplica.
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
      // Ambos van antes del alias "@": en pruebas se habla SQLite, con el
      // cliente que `tests/global-setup.ts` genera desde el mismo esquema.
      "@/lib/prisma": fileURLToPath(
        new URL("./tests/stubs/prisma.ts", import.meta.url),
      ),
      "@/generated/prisma": fileURLToPath(
        new URL("./tests/.generated/prisma", import.meta.url),
      ),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    // Las pruebas comparten una sola base SQLite y la limpian entre casos.
    fileParallelism: false,
    env: {
      DATABASE_URL: "file:./tests/test.db",
      SESSION_SECRET: "secreto-solo-para-pruebas",
    },
  },
});
