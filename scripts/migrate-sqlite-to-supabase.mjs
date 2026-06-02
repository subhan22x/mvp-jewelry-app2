import { Client } from "pg";
import { loadEnvLocal } from "./env-local.mjs";
import { createSqliteClient } from "./sqlite-client.mjs";
import { getSqliteSourceUrl } from "./sqlite-source.mjs";

const envLocal = loadEnvLocal();
const postgresUrl = envLocal.DIRECT_URL || envLocal.DATABASE_URL;
if (!postgresUrl) {
  console.error("DIRECT_URL or DATABASE_URL must be present in .env.local.");
  process.exit(1);
}
if (!postgresUrl.startsWith("postgresql://") && !postgresUrl.startsWith("postgres://")) {
  console.error("DIRECT_URL or DATABASE_URL must point to Postgres.");
  process.exit(1);
}
if (postgresUrl.includes("[YOUR-PASSWORD]")) {
  console.error("Replace [YOUR-PASSWORD] in .env.local before migrating metadata to Supabase.");
  process.exit(1);
}

const sqlite = await createSqliteClient();

const pg = new Client({
  connectionString: postgresUrl,
  ssl: { rejectUnauthorized: false }
});

const TABLES = [
  {
    table: "Account",
    delegate: "account",
    columns: ["id", "name", "slug", "logoUrl", "themeKey", "status", "stripeCustomerId", "stripeSubscriptionId", "subscriptionStatus", "createdAt", "updatedAt"],
  },
  {
    table: "User",
    delegate: "user",
    columns: ["id", "storeName", "email", "name", "phone", "passwordHash", "role", "createdAt"],
  },
  {
    table: "AccountMembership",
    delegate: "accountMembership",
    columns: ["id", "accountId", "userId", "role", "status", "createdAt", "updatedAt"],
  },
  {
    table: "Request",
    delegate: "request",
    columns: ["id", "createdAt", "accountId", "userId", "productType", "pendantFinish", "styleId", "text", "twoTone", "primaryMetal", "secondaryMetal", "emblem", "size", "metalType", "stoneType", "plainColor", "plainMetal", "plainKarat", "plainChain", "uploadFileName"],
  },
  {
    table: "Result",
    delegate: "result",
    columns: ["id", "accountId", "requestId", "variant", "prompt", "imageUrl", "modelId", "status", "error", "startedAt", "completedAt", "durationMs", "createdAt"],
  },
  {
    table: "ResultRevision",
    delegate: "resultRevision",
    columns: ["id", "accountId", "requestId", "sourceResultId", "revisionNumber", "prompt", "imageUrl", "status", "error", "provider", "modelId", "completedAt", "durationMs", "createdAt"],
  },
  {
    table: "Lead",
    delegate: "lead",
    columns: ["id", "accountId", "requestId", "name", "phone", "email", "createdAt"],
  },
  {
    table: "VideoGeneration",
    delegate: "videoGeneration",
    columns: ["id", "accountId", "requestId", "sourceResultId", "sourceImageUrl", "prompt", "videoUrl", "remoteVideoUrl", "modelId", "providerJobId", "status", "error", "startedAt", "completedAt", "durationMs", "createdAt"],
  },
  {
    table: "QuoteRequest",
    delegate: "quoteRequest",
    columns: ["id", "accountId", "requestId", "resultId", "videoId", "designedImageUrl", "videoUrl", "generatedAt", "productType", "pendantFinish", "styleId", "text", "twoTone", "primaryMetal", "secondaryMetal", "emblem", "size", "metalType", "stoneType", "plainColor", "plainMetal", "plainKarat", "plainChain", "diamondQuality", "customerName", "customerPhone", "customerEmail", "status", "quotedPriceCents", "quoteNotes", "estimatedDelivery", "quoteMaterial", "quoteMaterialKarat", "quoteStoneType", "referenceImageUrlsJson", "createdAt"],
  },
  {
    table: "AppSetting",
    delegate: "appSetting",
    columns: ["key", "accountId", "value", "updatedAt", "createdAt"],
    conflictColumns: ["key"],
  },
  {
    table: "StoreProfile",
    delegate: "storeProfile",
    columns: ["id", "accountId", "displayName", "headline", "bio", "profileImageUrl", "coverImageUrl", "coverPreset", "coverOverlayOpacity", "coverTextColor", "phone", "whatsappPhone", "websiteUrl", "extraLinksJson", "instagramHandle", "addressLine1", "addressLine2", "city", "state", "postalCode", "country", "yearStarted", "statusLabel", "verificationLabel", "isPublished", "createdAt", "updatedAt"],
  },
  {
    table: "StoreService",
    delegate: "storeService",
    columns: ["id", "accountId", "title", "description", "kind", "ctaLabel", "href", "sortOrder", "isActive", "createdAt", "updatedAt"],
  },
  {
    table: "ProductCollection",
    delegate: "productCollection",
    columns: ["id", "accountId", "title", "slug", "description", "sortOrder", "isActive", "createdAt", "updatedAt"],
  },
  {
    table: "Product",
    delegate: "product",
    columns: ["id", "accountId", "collectionId", "name", "slug", "description", "imageUrl", "category", "priceLabel", "priceMode", "material", "metalDetail", "stoneQuality", "weightLabel", "badgeLabel", "variantLabelsJson", "href", "isFeatured", "isActive", "sortOrder", "createdAt", "updatedAt"],
  },
  {
    table: "StoreReview",
    delegate: "storeReview",
    columns: ["id", "accountId", "reviewerName", "reviewerPhone", "reviewerEmail", "reviewerInstagram", "rating", "reviewText", "status", "source", "createdAt", "updatedAt"],
  },
  {
    table: "VvsStudioShoot",
    delegate: "vvsStudioShoot",
    columns: ["id", "accountId", "createdByUserId", "pieceType", "visualStyle", "mood", "aspectRatio", "videoDurationSeconds", "metalType", "goldColor", "diamondWeight", "engravingText", "priceLabel", "stoneSetting", "status", "error", "imageFinalizedAt", "completedAt", "createdAt", "updatedAt"],
  },
  {
    table: "VvsStudioUpload",
    delegate: "vvsStudioUpload",
    columns: ["id", "accountId", "shootId", "angle", "storageKey", "imageUrl", "originalContentType", "normalizedContentType", "fileSize", "width", "height", "originalFileNameHash", "createdAt"],
  },
  {
    table: "VvsStudioImageGeneration",
    delegate: "vvsStudioImageGeneration",
    columns: ["id", "accountId", "shootId", "variant", "status", "prompt", "promptVersion", "provider", "modelId", "providerJobId", "imageUrl", "error", "startedAt", "completedAt", "durationMs", "createdAt"],
  },
  {
    table: "VvsStudioVideoGeneration",
    delegate: "vvsStudioVideoGeneration",
    columns: ["id", "accountId", "shootId", "sourceImageGenerationId", "sourceImageUrl", "status", "prompt", "promptVersion", "provider", "modelId", "providerJobId", "videoDurationSeconds", "videoUrl", "remoteVideoUrl", "error", "startedAt", "completedAt", "durationMs", "createdAt"],
  },
];

function cleanRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value === undefined ? null : value])
  );
}

async function upsert({ table, columns, conflictColumns = ["id"] }, rows) {
  if (rows.length === 0) return;

  const quotedColumns = columns.map(column => `"${column}"`).join(", ");
  const conflict = conflictColumns.map(column => `"${column}"`).join(", ");
  const updates = columns
    .filter(column => !conflictColumns.includes(column))
    .map(column => `"${column}" = EXCLUDED."${column}"`)
    .join(", ");

  for (const sourceRow of rows.map(cleanRow)) {
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const values = columns.map(column => sourceRow[column] ?? null);
    await pg.query(
      `INSERT INTO "${table}" (${quotedColumns}) VALUES (${placeholders})
       ON CONFLICT (${conflict}) ${updates ? `DO UPDATE SET ${updates}` : "DO NOTHING"}`,
      values
    );
  }
}

async function verifyRows(table, rows) {
  if (rows.length === 0) return { source: 0, matched: 0 };
  const primaryKey = table.conflictColumns?.[0] ?? "id";
  const sourceKeys = rows.map(row => row[primaryKey]);
  const response = await pg.query(
    `SELECT COUNT(*)::int AS "matched" FROM "${table.table}" WHERE "${primaryKey}" = ANY($1)`,
    [sourceKeys]
  );
  return { source: rows.length, matched: response.rows[0].matched };
}

async function main() {
  console.log(`SQLite source: ${getSqliteSourceUrl()}`);
  await pg.connect();
  await pg.query("BEGIN");

  try {
    const copied = [];
    for (const table of TABLES) {
      const rows = await sqlite[table.delegate].findMany();
      await upsert(table, rows);
      copied.push({ table, rows });
      console.log(`- ${table.table}: upserted ${rows.length}`);
    }

    console.log("Verifying migrated rows:");
    for (const { table, rows } of copied) {
      const { source, matched } = await verifyRows(table, rows);
      if (source !== matched) {
        throw new Error(`${table.table}: expected ${source} migrated rows, found ${matched}`);
      }
      console.log(`- ${table.table}: ${matched}/${source}`);
    }

    await pg.query("COMMIT");
    console.log("Supabase metadata migration completed.");
  } catch (error) {
    await pg.query("ROLLBACK");
    throw error;
  }
}

try {
  await main();
} finally {
  await sqlite.$disconnect();
  await pg.end().catch(() => {});
}
