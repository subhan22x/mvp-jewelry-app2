import { randomBytes } from "node:crypto";

export function normalizeBatchCode(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!/^[A-Z0-9][A-Z0-9-]{1,30}$/.test(normalized)) {
    throw new Error("Batch code must contain 2-31 letters, numbers, or dashes.");
  }
  return normalized;
}

export function qrKitDisplayCode(batchCode: string, ordinal: number) {
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 9999) {
    throw new Error("Kit ordinal must be between 1 and 9999.");
  }
  return `GJ-${batchCode}-${String(ordinal).padStart(3, "0")}`;
}

export function createQrKitPublicToken() {
  return randomBytes(24).toString("base64url");
}
