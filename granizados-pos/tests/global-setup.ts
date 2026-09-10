import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, rmSync, writeFileSync } from "node:fs";

const TEST_DB_FILE = "tests/test.db";
const TEST_DB_URL = `file:./${TEST_DB_FILE}`;
const SQLITE_SCHEMA = "tests/.schema-sqlite.prisma";
const SQLITE_SQL = "tests/.schema.sql";
const SQLITE_CLIENT = "tests/.generated";

function clean() {
  for (const path of [TEST_DB_FILE, SQLITE_SCHEMA, SQLITE_SQL, SQLITE_CLIENT]) {
    rmSync(path, { force: true, recursive: true });
  }
}

export default function setup() {
  process.env.DATABASE_URL = TEST_DB_URL;
  clean();

  // El esquema real es PostgreSQL, pero una base de servidor no se puede
  // levantar dentro de las pruebas. Se traduce el datasource a SQLite —mismos
  // modelos, mismas relaciones— y de ahí salen las tablas y su cliente.
  const schema = readFileSync("prisma/schema.prisma", "utf8")
    .replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"')
    .replace(/output\s*=\s*"[^"]*"/, 'output = "./.generated/prisma"');
  writeFileSync(SQLITE_SCHEMA, schema);

  const run = (command: string) =>
    execSync(command, { stdio: "inherit", shell: "/bin/bash" });

  run(`npx prisma generate --schema ${SQLITE_SCHEMA}`);
  run(
    `npx prisma migrate diff --from-empty --to-schema ${SQLITE_SCHEMA} --script > ${SQLITE_SQL}`,
  );

  const Database = createRequire(import.meta.url)("better-sqlite3");
  const db = new Database(TEST_DB_FILE);
  db.exec(readFileSync(SQLITE_SQL, "utf8"));
  db.close();

  return clean;
}
