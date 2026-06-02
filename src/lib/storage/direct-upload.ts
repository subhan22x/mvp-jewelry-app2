import path from "node:path";
import mime from "mime";
import { z } from "zod";
import { readFromR2, r2PublicUrl } from "./r2";

export const DIRECT_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;

export const directUploadReferenceSchema = z.object({
  key: z.string().startsWith("incoming/"),
  contentType: z.string().min(1),
  size: z.number().int().positive().max(DIRECT_UPLOAD_MAX_BYTES),
  originalName: z.string().min(1).max(240)
});

export type DirectUploadReference = z.infer<typeof directUploadReferenceSchema>;

export function parseDirectUploadReference(value: unknown, expectedPurpose?: string) {
  if (typeof value !== "string" || !value.trim()) return null;
  const reference = directUploadReferenceSchema.parse(JSON.parse(value));
  if (expectedPurpose && !reference.key.startsWith(`incoming/${expectedPurpose}/`)) {
    throw new Error("Uploaded file purpose does not match this request.");
  }
  return reference;
}

export function directUploadPublicUrl(reference: DirectUploadReference) {
  return r2PublicUrl(reference.key);
}

export async function readDirectUpload(reference: DirectUploadReference) {
  return readFromR2(reference.key);
}

export function directUploadExtension(fileName: string, contentType: string) {
  const fromName = path.extname(fileName).toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  const fromType = mime.getExtension(contentType);
  return fromType ? `.${fromType}` : ".bin";
}
