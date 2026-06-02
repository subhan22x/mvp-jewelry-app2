import { spawnSync } from "node:child_process";
import { getSqliteSourceUrl } from "./sqlite-source.mjs";

let SqlitePrismaClient;

function generateSqliteClient() {
  const result = spawnSync(
    "npx",
    ["prisma", "generate", "--schema", "prisma/schema.sqlite.prisma"],
    { stdio: "inherit" }
  );
  if (result.status !== 0) {
    throw new Error("Unable to generate the archived SQLite Prisma client.");
  }
}

export async function createSqliteClient() {
  if (!SqlitePrismaClient) {
    generateSqliteClient();
    ({ PrismaClient: SqlitePrismaClient } = await import("../generated/sqlite-client/index.js"));
  }

  return new SqlitePrismaClient({
    datasources: { db: { url: getSqliteSourceUrl() } }
  });
}

