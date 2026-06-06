import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const TEXT_REFERENCE_DIR = path.join(os.tmpdir(), "flawless-style-text-references");

function isInsideDir(filePath: string, dir: string) {
  const relative = path.relative(dir, filePath);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function contentTypeFor(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const encodedPath = url.searchParams.get("p");
  if (!encodedPath) {
    return new NextResponse("Missing image path.", { status: 400 });
  }

  let filePath: string;
  try {
    filePath = Buffer.from(encodedPath, "base64url").toString("utf8");
  } catch {
    return new NextResponse("Invalid image path.", { status: 400 });
  }

  if (!isInsideDir(filePath, PUBLIC_DIR) && !isInsideDir(filePath, TEXT_REFERENCE_DIR)) {
    return new NextResponse("Image path is not allowed.", { status: 403 });
  }

  try {
    const buffer = await fs.readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentTypeFor(filePath),
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return new NextResponse("Image not found.", { status: 404 });
  }
}
