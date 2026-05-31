import path from "node:path";

const DEFAULT_SQLITE_PATH = path.join(process.cwd(), "prisma", "dev.db");

export function getSqliteSourceUrl() {
  const configured = process.env.SQLITE_SOURCE_DATABASE_URL?.trim();
  if (configured) return configured;
  return `file:${DEFAULT_SQLITE_PATH}`;
}

