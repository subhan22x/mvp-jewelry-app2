import fs from "node:fs/promises";
import path from "node:path";
import mime from "mime";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GENERATED_DIR = process.env.GENERATED_IMAGE_DIR ?? path.join(process.cwd(), "public", "generated");

function safeGeneratedPath(file: string) {
  const fileName = path.basename(file);
  if (fileName !== file) return null;
  return path.join(GENERATED_DIR, fileName);
}

export async function GET(_: Request, { params }: { params: { file: string } }) {
  const filePath = safeGeneratedPath(params.file);
  if (!filePath) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const buffer = await fs.readFile(filePath);
    const contentType = mime.getType(filePath) ?? "application/octet-stream";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
