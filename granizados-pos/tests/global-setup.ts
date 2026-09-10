import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const TEST_DB = "file:./tests/test.db";

export default function setup() {
  process.env.DATABASE_URL = TEST_DB;
  rmSync("tests/test.db", { force: true });
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DB },
  });

  return () => {
    rmSync("tests/test.db", { force: true });
  };
}
