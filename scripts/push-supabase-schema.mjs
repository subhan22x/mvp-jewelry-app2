import { spawn } from "node:child_process";
import { loadEnvLocal } from "./env-local.mjs";

const envLocal = loadEnvLocal();
if (!envLocal.DATABASE_URL || !envLocal.DIRECT_URL) {
  console.error("DATABASE_URL and DIRECT_URL must be present in .env.local.");
  process.exit(1);
}
if (envLocal.DATABASE_URL.includes("[YOUR-PASSWORD]") || envLocal.DIRECT_URL.includes("[YOUR-PASSWORD]")) {
  console.error("Replace [YOUR-PASSWORD] in DATABASE_URL and DIRECT_URL before pushing to Supabase.");
  process.exit(1);
}

const child = spawn(
  "npx",
  ["prisma", "db", "push", "--schema", "prisma/schema.postgres.prisma", "--skip-generate"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: envLocal.DATABASE_URL,
      DIRECT_URL: envLocal.DIRECT_URL
    }
  }
);

child.on("exit", code => process.exit(code ?? 1));
