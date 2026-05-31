import { Client } from "pg";
import { PrismaClient } from "@prisma/client";
import { loadEnvLocal } from "./env-local.mjs";
import { getSqliteSourceUrl } from "./sqlite-source.mjs";

const TABLES = [
  ["Account", "account"],
  ["User", "user"],
  ["AccountMembership", "accountMembership"],
  ["Request", "request"],
  ["Result", "result"],
  ["ResultRevision", "resultRevision"],
  ["Lead", "lead"],
  ["VideoGeneration", "videoGeneration"],
  ["QuoteRequest", "quoteRequest"],
  ["AppSetting", "appSetting"],
  ["StoreProfile", "storeProfile"],
  ["StoreService", "storeService"],
  ["ProductCollection", "productCollection"],
  ["Product", "product"],
  ["StoreReview", "storeReview"],
  ["VvsStudioShoot", "vvsStudioShoot"],
  ["VvsStudioUpload", "vvsStudioUpload"],
  ["VvsStudioImageGeneration", "vvsStudioImageGeneration"],
  ["VvsStudioVideoGeneration", "vvsStudioVideoGeneration"],
];

const sqlite = new PrismaClient({
  datasources: { db: { url: getSqliteSourceUrl() } }
});

const sqliteCounts = new Map();
console.log(`SQLite source: ${getSqliteSourceUrl()}`);
for (const [table, delegate] of TABLES) {
  const count = await sqlite[delegate].count();
  sqliteCounts.set(table, count);
  console.log(`- ${table}: ${count}`);
}
await sqlite.$disconnect();

const envLocal = loadEnvLocal();
const postgresUrl = envLocal.DIRECT_URL || envLocal.DATABASE_URL;
if (!postgresUrl || (!postgresUrl.startsWith("postgresql://") && !postgresUrl.startsWith("postgres://"))) {
  console.log("Supabase/Postgres: no usable Postgres URL configured.");
  process.exit(0);
}

const pg = new Client({
  connectionString: postgresUrl,
  ssl: { rejectUnauthorized: false }
});

await pg.connect();
try {
  console.log("Supabase/Postgres:");
  let mismatch = false;
  for (const [table] of TABLES) {
    const response = await pg.query(`SELECT COUNT(*)::int AS "count" FROM "${table}"`);
    const postgresCount = response.rows[0].count;
    const sqliteCount = sqliteCounts.get(table);
    const matches = sqliteCount === postgresCount;
    mismatch ||= !matches;
    console.log(`- ${table}: ${postgresCount} ${matches ? "(matches SQLite)" : `(SQLite: ${sqliteCount})`}`);
  }
  if (mismatch) process.exitCode = 1;
} finally {
  await pg.end();
}

