import fs from "node:fs/promises";
import path from "node:path";
import { isR2Configured, readFromR2, uploadToR2 } from "../storage/r2";

const OUTPUT_DIR = process.env.GENERATED_IMAGE_DIR ?? path.join(process.cwd(), "public", "generated");
const R2_PREFIX = "r2://";

export type VvsStoredSourceUpload = {
  storageKey: string;
  imageUrl: string;
};

export type VvsSourceAttachment = {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
};

export async function saveVvsSourceUpload({
  buffer,
  accountId,
  shootId,
  angle,
  uploadId,
}: {
  buffer: Buffer;
  accountId: string;
  shootId: string;
  angle: string;
  uploadId: string;
}): Promise<VvsStoredSourceUpload> {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
  const safeAccount = accountId.replace(/[^a-z0-9_-]/gi, "_");
  const key = `vvs-studio/${safeAccount}/${stamp}-${shootId}-${angle}-${uploadId}.jpg`;

  if (isR2Configured()) {
    await uploadToR2({
      key,
      body: buffer,
      contentType: "image/jpeg",
      cacheControl: "private, max-age=0, no-store",
    });
    return { storageKey: key, imageUrl: `${R2_PREFIX}${key}` };
  }

  const dir = path.join(OUTPUT_DIR, "vvs-studio", "uploads");
  const fileName = `${stamp}-${shootId}-${angle}-${uploadId}.jpg`;
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), buffer);
  return {
    storageKey: path.join("vvs-studio", "uploads", fileName),
    imageUrl: `/generated/vvs-studio/uploads/${fileName}`,
  };
}

export async function readVvsSourceAttachment(upload: {
  storageKey: string;
  imageUrl: string;
  angle: string;
  normalizedContentType?: string | null;
}): Promise<VvsSourceAttachment> {
  if (upload.imageUrl.startsWith(R2_PREFIX)) {
    const key = upload.imageUrl.slice(R2_PREFIX.length);
    const { buffer, contentType } = await readFromR2(key);
    return {
      buffer,
      mimeType: upload.normalizedContentType ?? contentType,
      fileName: `${upload.angle}.jpg`,
    };
  }

  const relative = upload.imageUrl.replace(/^\/generated\//, "");
  const filePath = path.join(OUTPUT_DIR, relative);
  return {
    buffer: await fs.readFile(filePath),
    mimeType: upload.normalizedContentType ?? "image/jpeg",
    fileName: `${upload.angle}.jpg`,
  };
}
