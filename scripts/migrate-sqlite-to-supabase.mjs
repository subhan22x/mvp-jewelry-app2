import { Client } from "pg";
import { PrismaClient } from "@prisma/client";
import { loadEnvLocal } from "./env-local.mjs";

const envLocal = loadEnvLocal();
const postgresUrl = envLocal.DIRECT_URL || envLocal.DATABASE_URL;
if (!postgresUrl) {
  console.error("DIRECT_URL or DATABASE_URL must be present in .env.local.");
  process.exit(1);
}
if (postgresUrl.includes("[YOUR-PASSWORD]")) {
  console.error("Replace [YOUR-PASSWORD] in .env.local before migrating metadata to Supabase.");
  process.exit(1);
}

const sqlite = new PrismaClient({
  datasources: { db: { url: "file:./dev.db" } }
});

const pg = new Client({
  connectionString: postgresUrl,
  ssl: { rejectUnauthorized: false }
});

function cleanRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value === undefined ? null : value])
  );
}

async function upsert(table, columns, rows, conflictColumns, updateColumns = columns) {
  if (rows.length === 0) return 0;

  const quotedTable = `"${table}"`;
  const quotedColumns = columns.map(column => `"${column}"`).join(", ");
  const conflict = conflictColumns.map(column => `"${column}"`).join(", ");
  const updates = updateColumns
    .filter(column => !conflictColumns.includes(column))
    .map(column => `"${column}" = EXCLUDED."${column}"`)
    .join(", ");

  for (const sourceRow of rows.map(cleanRow)) {
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const values = columns.map(column => sourceRow[column] ?? null);
    const sql = `
      INSERT INTO ${quotedTable} (${quotedColumns})
      VALUES (${placeholders})
      ON CONFLICT (${conflict})
      ${updates ? `DO UPDATE SET ${updates}` : "DO NOTHING"}
    `;
    await pg.query(sql, values);
  }

  return rows.length;
}

async function main() {
  await pg.connect();

  const accounts = await sqlite.account.findMany();
  const users = await sqlite.user.findMany();
  const memberships = await sqlite.accountMembership.findMany();
  const requests = await sqlite.request.findMany({ orderBy: { createdAt: "asc" } });
  const results = await sqlite.result.findMany({ orderBy: { createdAt: "asc" } });
  const leads = await sqlite.lead.findMany({ orderBy: { createdAt: "asc" } });
  const videos = await sqlite.videoGeneration.findMany({ orderBy: { createdAt: "asc" } });
  const quotes = await sqlite.quoteRequest.findMany({ orderBy: { createdAt: "asc" } });
  const settings = await sqlite.appSetting.findMany();
  const storeProfiles = await sqlite.storeProfile.findMany({ orderBy: { createdAt: "asc" } });
  const storeServices = await sqlite.storeService.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const productCollections = await sqlite.productCollection.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  const products = await sqlite.product.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });

  const counts = {};
  counts.Account = await upsert(
    "Account",
    ["id", "name", "slug", "logoUrl", "themeKey", "status", "stripeCustomerId", "stripeSubscriptionId", "subscriptionStatus", "createdAt", "updatedAt"],
    accounts,
    ["id"]
  );
  counts.User = await upsert(
    "User",
    ["id", "storeName", "email", "name", "phone", "passwordHash", "role", "createdAt"],
    users,
    ["id"]
  );
  counts.AccountMembership = await upsert(
    "AccountMembership",
    ["id", "accountId", "userId", "role", "status", "createdAt", "updatedAt"],
    memberships,
    ["id"]
  );
  counts.Request = await upsert(
    "Request",
    ["id", "createdAt", "accountId", "userId", "productType", "styleId", "text", "twoTone", "primaryMetal", "secondaryMetal", "emblem", "uploadFileName"],
    requests,
    ["id"]
  );
  counts.Result = await upsert(
    "Result",
    ["id", "accountId", "requestId", "variant", "prompt", "imageUrl", "modelId", "status", "error", "startedAt", "completedAt", "durationMs", "createdAt"],
    results,
    ["id"]
  );
  counts.Lead = await upsert(
    "Lead",
    ["id", "accountId", "requestId", "name", "phone", "email", "createdAt"],
    leads,
    ["id"]
  );
  counts.VideoGeneration = await upsert(
    "VideoGeneration",
    ["id", "accountId", "requestId", "sourceResultId", "sourceImageUrl", "prompt", "videoUrl", "remoteVideoUrl", "modelId", "providerJobId", "status", "error", "startedAt", "completedAt", "durationMs", "createdAt"],
    videos,
    ["id"]
  );
  counts.QuoteRequest = await upsert(
    "QuoteRequest",
    ["id", "accountId", "requestId", "resultId", "videoId", "designedImageUrl", "videoUrl", "generatedAt", "productType", "styleId", "text", "twoTone", "primaryMetal", "secondaryMetal", "emblem", "diamondQuality", "customerName", "customerPhone", "customerEmail", "status", "quotedPriceCents", "quoteNotes", "referenceImageUrlsJson", "createdAt"],
    quotes,
    ["id"]
  );
  counts.AppSetting = await upsert(
    "AppSetting",
    ["key", "accountId", "value", "updatedAt", "createdAt"],
    settings,
    ["key"]
  );
  counts.StoreProfile = await upsert(
    "StoreProfile",
    ["id", "accountId", "displayName", "headline", "bio", "profileImageUrl", "coverImageUrl", "coverPreset", "coverOverlayOpacity", "coverTextColor", "phone", "whatsappPhone", "instagramHandle", "city", "country", "yearStarted", "statusLabel", "verificationLabel", "isPublished", "createdAt", "updatedAt"],
    storeProfiles,
    ["id"]
  );
  counts.StoreService = await upsert(
    "StoreService",
    ["id", "accountId", "title", "description", "kind", "ctaLabel", "href", "sortOrder", "isActive", "createdAt", "updatedAt"],
    storeServices,
    ["id"]
  );
  counts.ProductCollection = await upsert(
    "ProductCollection",
    ["id", "accountId", "title", "slug", "description", "sortOrder", "isActive", "createdAt", "updatedAt"],
    productCollections,
    ["id"]
  );
  counts.Product = await upsert(
    "Product",
    ["id", "accountId", "collectionId", "name", "slug", "description", "imageUrl", "priceLabel", "badgeLabel", "variantLabelsJson", "href", "isFeatured", "isActive", "sortOrder", "createdAt", "updatedAt"],
    products,
    ["id"]
  );

  console.log("Migrated SQLite metadata to Supabase/Postgres:");
  for (const [table, count] of Object.entries(counts)) {
    console.log(`- ${table}: ${count}`);
  }
}

try {
  await main();
} finally {
  await sqlite.$disconnect();
  await pg.end().catch(() => {});
}
