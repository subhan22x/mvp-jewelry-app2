import fs from "node:fs/promises";
import path from "node:path";
import mime from "mime";
import { isR2Configured, uploadToR2 } from "./r2";

const GENERATED_DIR = process.env.GENERATED_IMAGE_DIR ?? path.join(process.cwd(), "public", "generated");

function safeExtension(file: File) {
  const fromName = path.extname(file.name || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov", ".webm"].includes(fromName)) return fromName;
  const fromType = mime.getExtension(file.type || "");
  return fromType ? `.${fromType}` : ".bin";
}

export async function savePublicUpload(file: File, keyPrefix: string, nameSeed: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = safeExtension(file);
  const fileName = `${nameSeed}${extension}`;
  const key = `${keyPrefix.replace(/^\/+|\/+$/g, "")}/${fileName}`;
  const contentType = file.type || mime.getType(fileName) || "application/octet-stream";

  if (isR2Configured()) {
    return uploadToR2({
      key,
      body: buffer,
      contentType
    });
  }

  const filePath = path.join(GENERATED_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return `/generated/${key}`;
}
