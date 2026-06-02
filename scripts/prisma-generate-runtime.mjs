import { spawnSync } from "node:child_process";
import { loadEnvLocal } from "./env-local.mjs";

const envLocal = loadEnvLocal();
const result = spawnSync(
  "npx",
  ["prisma", "generate"],
  {
    stdio: "inherit",
    env: { ...process.env, ...envLocal }
  }
);

process.exit(result.status ?? 1);

