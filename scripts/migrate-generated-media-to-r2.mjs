import fs from "node:fs/promises";
import path from "node:path";
import mime from "mime";
import { Client } from "pg";
import { PrismaClient } from "@prisma/client";
import { loadEnvLocal } from "./env-local.mjs";
import { getR2Config, uploadToR2 } from "../src/lib/storage/r2.ts";

const envLocal = loadEnvLocal();
Object.assign(process.env, envLocal);

const generatedDir = process.env.GENERATED_IMAGE_DIR ?? path.join(process.cwd(), "public", "generated");
const r2Config = getR2Config();

if (!r2Config) {
  console.error("R2 is not configured. Add R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_BASE_URL to .env.local.");
  console.error("R2_ENDPOINT is optional when R2_ACCOUNT_ID is present.");
  process.exit(1);
}

function generatedFileNameFromUrl(value) {
  if (!value) return null;
  if (value.startsWith("/generated/")) return path.basename(value);

  try {
    const parsed = new URL(value);
    if (parsed.pathname.startsWith("/generated/")) return path.basename(parsed.pathname);
  } catch {
    return null;
  }

  return null;
}

function r2UrlForGeneratedValue(value, urlByFileName) {
  const fileName = generatedFileNameFromUrl(value);
  return fileName ? urlByFileName.get(fileName) ?? null : null;
}

async function generatedFiles() {
  const entries = await fs.readdir(generatedDir, { withFileTypes: true }).catch(error => {
    if (error.code === "ENOENT") return [];
    throw error;
  });

  return entries
    .filter(entry => entry.isFile() && entry.name !== ".gitkeep")
    .map(entry => entry.name)
    .sort();
}

async function uploadGeneratedFiles(fileNames) {
  const urlByFileName = new Map();

  for (const fileName of fileNames) {
    const filePath = path.join(generatedDir, fileName);
    const body = await fs.readFile(filePath);
    const contentType = mime.getType(filePath) ?? "application/octet-stream";
    const url = await uploadToR2({
      key: `generated/${fileName}`,
      body,
      contentType
    });
    urlByFileName.set(fileName, url);
  }

  return urlByFileName;
}

async function updateSqlite(urlByFileName) {
  const prisma = new PrismaClient({
    datasources: { db: { url: "file:./dev.db" } }
  });

  const counts = {
    Result: 0,
    VideoGeneration: 0,
    QuoteRequest: 0
  };

  try {
    const results = await prisma.result.findMany({ select: { id: true, imageUrl: true } });
    for (const row of results) {
      const imageUrl = r2UrlForGeneratedValue(row.imageUrl, urlByFileName);
      if (!imageUrl || imageUrl === row.imageUrl) continue;
      await prisma.result.update({ where: { id: row.id }, data: { imageUrl } });
      counts.Result += 1;
    }

    const videos = await prisma.videoGeneration.findMany({
      select: { id: true, sourceImageUrl: true, videoUrl: true }
    });
    for (const row of videos) {
      const data = {};
      const sourceImageUrl = r2UrlForGeneratedValue(row.sourceImageUrl, urlByFileName);
      const videoUrl = r2UrlForGeneratedValue(row.videoUrl, urlByFileName);
      if (sourceImageUrl && sourceImageUrl !== row.sourceImageUrl) data.sourceImageUrl = sourceImageUrl;
      if (videoUrl && videoUrl !== row.videoUrl) data.videoUrl = videoUrl;
      if (Object.keys(data).length === 0) continue;
      await prisma.videoGeneration.update({ where: { id: row.id }, data });
      counts.VideoGeneration += 1;
    }

    const quotes = await prisma.quoteRequest.findMany({
      select: { id: true, designedImageUrl: true, videoUrl: true }
    });
    for (const row of quotes) {
      const data = {};
      const designedImageUrl = r2UrlForGeneratedValue(row.designedImageUrl, urlByFileName);
      const videoUrl = r2UrlForGeneratedValue(row.videoUrl, urlByFileName);
      if (designedImageUrl && designedImageUrl !== row.designedImageUrl) data.designedImageUrl = designedImageUrl;
      if (videoUrl && videoUrl !== row.videoUrl) data.videoUrl = videoUrl;
      if (Object.keys(data).length === 0) continue;
      await prisma.quoteRequest.update({ where: { id: row.id }, data });
      counts.QuoteRequest += 1;
    }
  } finally {
    await prisma.$disconnect();
  }

  return counts;
}

async function updatePostgresTable(pg, table, fields, urlByFileName) {
  const quotedFields = fields.map(field => `"${field}"`).join(", ");
  const rows = await pg.query(`SELECT "id", ${quotedFields} FROM "${table}"`);
  let updated = 0;

  for (const row of rows.rows) {
    const data = {};
    for (const field of fields) {
      const nextUrl = r2UrlForGeneratedValue(row[field], urlByFileName);
      if (nextUrl && nextUrl !== row[field]) data[field] = nextUrl;
    }
    const entries = Object.entries(data);
    if (entries.length === 0) continue;

    const sets = entries.map(([field], index) => `"${field}" = $${index + 1}`).join(", ");
    await pg.query(`UPDATE "${table}" SET ${sets} WHERE "id" = $${entries.length + 1}`, [
      ...entries.map(([, value]) => value),
      row.id
    ]);
    updated += 1;
  }

  return updated;
}

async function updateSupabase(urlByFileName) {
  const postgresUrl = envLocal.DIRECT_URL || envLocal.DATABASE_URL;
  if (!postgresUrl || postgresUrl.includes("[YOUR-PASSWORD]")) return null;

  const pg = new Client({
    connectionString: postgresUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pg.connect();
    return {
      Result: await updatePostgresTable(pg, "Result", ["imageUrl"], urlByFileName),
      VideoGeneration: await updatePostgresTable(pg, "VideoGeneration", ["sourceImageUrl", "videoUrl"], urlByFileName),
      QuoteRequest: await updatePostgresTable(pg, "QuoteRequest", ["designedImageUrl", "videoUrl"], urlByFileName)
    };
  } finally {
    await pg.end().catch(() => {});
  }
}

const files = await generatedFiles();
if (files.length === 0) {
  console.log("No files found in public/generated.");
  process.exit(0);
}

const urlByFileName = await uploadGeneratedFiles(files);
const sqliteCounts = await updateSqlite(urlByFileName);
const supabaseCounts = await updateSupabase(urlByFileName);

console.log("Migrated generated media to R2:");
console.log(`- Uploaded files: ${urlByFileName.size}`);
console.log("- Updated SQLite rows:");
for (const [table, count] of Object.entries(sqliteCounts)) {
  console.log(`  - ${table}: ${count}`);
}
if (supabaseCounts) {
  console.log("- Updated Supabase/Postgres rows:");
  for (const [table, count] of Object.entries(supabaseCounts)) {
    console.log(`  - ${table}: ${count}`);
  }
} else {
  console.log("- Supabase/Postgres rows: skipped, no valid DATABASE_URL/DIRECT_URL found.");
}
