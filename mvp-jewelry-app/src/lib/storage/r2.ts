import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "node:stream";

type R2Config = {
  bucketName: string;
  endpoint: string;
  publicBaseUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
};

let cachedClient: S3Client | null = null;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getR2Config(): R2Config | null {
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim();
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");

  if (!bucketName || !accessKeyId || !secretAccessKey || !publicBaseUrl || !endpoint) return null;

  return {
    bucketName,
    endpoint,
    publicBaseUrl: trimTrailingSlash(publicBaseUrl),
    accessKeyId,
    secretAccessKey
  };
}

export function isR2Configured() {
  return Boolean(getR2Config());
}

function getClient(config: R2Config) {
  if (cachedClient) return cachedClient;

  cachedClient = new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    }
  });

  return cachedClient;
}

export function r2PublicUrl(key: string) {
  const config = getR2Config();
  if (!config) throw new Error("R2 is not configured.");
  return `${config.publicBaseUrl}/${key.replace(/^\/+/, "")}`;
}

export async function uploadToR2({
  key,
  body,
  contentType,
  cacheControl = "public, max-age=31536000, immutable"
}: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  cacheControl?: string;
}) {
  const config = getR2Config();
  if (!config) throw new Error("R2 is not configured.");

  await getClient(config).send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl
    })
  );

  return r2PublicUrl(key);
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  if (body && typeof body === "object" && "transformToByteArray" in body) {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(bytes);
  }
  throw new Error("Unsupported R2 response body.");
}

export async function readFromR2(key: string) {
  const config = getR2Config();
  if (!config) throw new Error("R2 is not configured.");

  const response = await getClient(config).send(
    new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key.replace(/^\/+/, "")
    })
  );

  return {
    buffer: await streamToBuffer(response.Body),
    contentType: response.ContentType ?? "application/octet-stream"
  };
}
