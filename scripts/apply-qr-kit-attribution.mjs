import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { loadEnvLocal } from "./env-local.mjs";

const envLocal = loadEnvLocal();
const connectionString = envLocal.DIRECT_URL || envLocal.DATABASE_URL;
if (!connectionString || !/^postgres(ql)?:\/\//.test(connectionString)) {
  console.error("DIRECT_URL or DATABASE_URL must point to Postgres.");
  process.exit(1);
}

const migrationPath = path.join(
  process.cwd(),
  "prisma/postgres-migrations/20260904100000_add_qr_kit_attribution.sql"
);
const sql = await fs.readFile(migrationPath, "utf8");
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

await client.connect();
try {
  await client.query(sql);
  console.log("QR kit attribution schema applied.");
} finally {
  await client.end();
}
