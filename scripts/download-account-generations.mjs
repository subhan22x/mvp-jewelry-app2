import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { loadEnvLocal } from "./env-local.mjs";
import { parseR2Key, r2KeyFromPublicUrl, readFromR2 } from "../src/lib/storage/r2.ts";

Object.assign(process.env, loadEnvLocal());

const DEFAULT_OUT_DIR = path.join(process.cwd(), "exports", "account-generations");

function usage() {
  console.log(`Usage:
  npm run r2:download-account -- --account <account-id|slug|owner-email> [--out <dir>] [--overwrite]

Examples:
  npm run r2:download-account -- --account demo-account
  npm run r2:download-account -- --account owner@example.com --out exports/owner-generations
`);
}

function parseArgs(argv) {
  const args = {
    account: null,
    outDir: DEFAULT_OUT_DIR,
    overwrite: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--account") args.account = argv[++i] ?? null;
    else if (arg === "--out") args.outDir = argv[++i] ?? null;
    else if (arg === "--overwrite") args.overwrite = true;
    else if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.account) throw new Error("Missing required --account value.");
  if (!args.outDir) throw new Error("Missing --out value.");
  return args;
}

function databaseUrl() {
  const value = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!value || value.includes("[YOUR-PASSWORD]")) {
    throw new Error("No valid DIRECT_URL or DATABASE_URL found. Add it to .env.local or the shell environment.");
  }
  return value;
}

async function connectPostgres() {
  const pg = new Client({
    connectionString: databaseUrl(),
    ssl: databaseUrl().includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  await pg.connect();
  return pg;
}

async function resolveAccountId(pg, value) {
  const direct = await pg.query(`SELECT "id", "slug", "name" FROM "Account" WHERE "id" = $1 OR "slug" = $1 LIMIT 1`, [value]);
  if (direct.rows[0]) return direct.rows[0];

  const byEmail = await pg.query(
    `SELECT a."id", a."slug", a."name"
       FROM "Account" a
       JOIN "AccountMembership" m ON m."accountId" = a."id"
       JOIN "User" u ON u."id" = m."userId"
      WHERE lower(u."email") = lower($1)
      ORDER BY a."createdAt" ASC
      LIMIT 1`,
    [value]
  );
  if (byEmail.rows[0]) return byEmail.rows[0];

  throw new Error(`No Account found for "${value}" as id, slug, or owner email.`);
}

async function tableExists(pg, table) {
  const result = await pg.query(`SELECT to_regclass($1) AS "name"`, [`public."${table}"`]);
  return Boolean(result.rows[0]?.name);
}

async function collectRows(pg, table, accountId, fields) {
  if (!(await tableExists(pg, table))) return [];
  const quotedFields = fields.map(field => `"${field}"`).join(", ");
  const result = await pg.query(
    `SELECT "id", "createdAt", ${quotedFields} FROM "${table}" WHERE "accountId" = $1 ORDER BY "createdAt" ASC`,
    [accountId]
  );

  const refs = [];
  for (const row of result.rows) {
    for (const field of fields) {
      const value = row[field];
      if (!value || typeof value !== "string") continue;
      refs.push({
        table,
        id: row.id,
        field,
        createdAt: row.createdAt,
        value,
      });
    }
  }
  return refs;
}

function extFromContentType(contentType) {
  if (!contentType) return "";
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("mp4")) return ".mp4";
  if (contentType.includes("gltf-binary")) return ".glb";
  return "";
}

function safeName(value) {
  return value.replace(/[^a-z0-9._-]+/gi, "_").replace(/^_+|_+$/g, "");
}

function fileNameFor(ref, source, contentType) {
  const fromUrl = source.kind === "url" ? path.basename(new URL(source.url).pathname) : path.basename(source.key);
  const parsedExt = path.extname(fromUrl);
  const ext = parsedExt || extFromContentType(contentType);
  const stem = safeName(`${ref.createdAt.toISOString().slice(0, 10)}-${ref.table}-${ref.id}-${ref.field}`);
  return `${stem}${ext}`;
}

function sourceFromValue(value) {
  const privateKey = parseR2Key(value);
  if (privateKey) return { kind: "r2", key: privateKey };

  const publicKey = r2KeyFromPublicUrl(value);
  if (publicKey) return { kind: "r2", key: publicKey };

  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return { kind: "url", url: value };
  } catch {
    return null;
  }

  return null;
}

async function readSource(source) {
  if (source.kind === "r2") return readFromR2(source.key);

  const response = await fetch(source.url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${source.url}`);
  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pg = await connectPostgres();

  try {
    const account = await resolveAccountId(pg, args.account);
    const exportDir = path.resolve(args.outDir, safeName(account.slug || account.id));
    await fs.mkdir(exportDir, { recursive: true });

    const refs = [
      ...(await collectRows(pg, "Result", account.id, ["imageUrl"])),
      ...(await collectRows(pg, "ResultRevision", account.id, ["imageUrl"])),
      ...(await collectRows(pg, "VideoGeneration", account.id, ["sourceImageUrl", "videoUrl"])),
      ...(await collectRows(pg, "Model3dGeneration", account.id, ["sourceImageUrl", "modelUrl"])),
      ...(await collectRows(pg, "QuoteRequest", account.id, ["designedImageUrl", "videoUrl"])),
      ...(await collectRows(pg, "VvsStudioUpload", account.id, ["imageUrl"])),
      ...(await collectRows(pg, "VvsStudioImageGeneration", account.id, ["imageUrl"])),
      ...(await collectRows(pg, "VvsStudioVideoGeneration", account.id, ["sourceImageUrl", "lastImageUrl", "videoUrl"])),
    ];

    const seen = new Map();
    for (const ref of refs) {
      const source = sourceFromValue(ref.value);
      if (!source) continue;
      const dedupeKey = source.kind === "r2" ? `r2:${source.key}` : `url:${source.url}`;
      if (!seen.has(dedupeKey)) seen.set(dedupeKey, { source, refs: [] });
      seen.get(dedupeKey).refs.push(ref);
    }

    const manifest = {
      account,
      exportedAt: new Date().toISOString(),
      files: [],
      skipped: [],
      failed: [],
    };

    let index = 0;
    for (const item of seen.values()) {
      index += 1;
      const primaryRef = item.refs[0];
      try {
        const { buffer, contentType } = await readSource(item.source);
        const fileName = fileNameFor(primaryRef, item.source, contentType);
        const filePath = path.join(exportDir, fileName);

        if (!args.overwrite) {
          try {
            await fs.access(filePath);
            manifest.skipped.push({ fileName, reason: "exists", refs: item.refs });
            continue;
          } catch {
            // File does not exist; continue with write.
          }
        }

        await fs.writeFile(filePath, buffer);
        manifest.files.push({
          fileName,
          contentType,
          bytes: buffer.length,
          source: item.source,
          refs: item.refs,
        });
        console.log(`[${index}/${seen.size}] saved ${fileName}`);
      } catch (error) {
        manifest.failed.push({
          source: item.source,
          refs: item.refs,
          error: error instanceof Error ? error.message : String(error),
        });
        console.warn(`[${index}/${seen.size}] failed ${primaryRef.table}.${primaryRef.field}: ${manifest.failed.at(-1).error}`);
      }
    }

    await fs.writeFile(path.join(exportDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    console.log(`Downloaded ${manifest.files.length} files to ${exportDir}`);
    console.log(`Skipped ${manifest.skipped.length}; failed ${manifest.failed.length}.`);
    console.log(`Manifest: ${path.join(exportDir, "manifest.json")}`);
  } finally {
    await pg.end().catch(() => {});
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  usage();
  process.exit(1);
});
