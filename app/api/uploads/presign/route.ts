import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { createPresignedR2Upload, isR2Configured } from "@/src/lib/storage/r2";
import { DIRECT_UPLOAD_MAX_BYTES, directUploadExtension } from "@/src/lib/storage/direct-upload";

export const dynamic = "force-dynamic";

const OWNER_PURPOSES = new Set(["owner-profile", "owner-product", "owner-vvs-source"]);
const PUBLIC_PURPOSES = new Set(["onboarding", "picture-pendant", "storefront-quote"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);

const Body = z.object({
  purpose: z.string().min(1),
  fileName: z.string().trim().min(1).max(240),
  contentType: z.string().trim().min(1),
  size: z.number().int().positive().max(DIRECT_UPLOAD_MAX_BYTES)
});

function safePurpose(value: string) {
  return value.replace(/[^a-z0-9_-]/gi, "_");
}

export async function POST(req: Request) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: "Direct R2 uploads are not configured." }, { status: 503 });
  }

  try {
    const body = Body.parse(await req.json());
    if (!OWNER_PURPOSES.has(body.purpose) && !PUBLIC_PURPOSES.has(body.purpose)) {
      return NextResponse.json({ error: "Unsupported upload purpose." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(body.contentType)) {
      return NextResponse.json({ error: "Upload must be a supported image format." }, { status: 415 });
    }
    if (OWNER_PURPOSES.has(body.purpose) && !await getOwnerContext()) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const extension = directUploadExtension(body.fileName, body.contentType);
    const key = `incoming/${safePurpose(body.purpose)}/${crypto.randomUUID()}${extension}`;
    const signed = await createPresignedR2Upload({
      key,
      contentType: body.contentType,
      contentLength: body.size
    });

    return NextResponse.json({
      key,
      contentType: body.contentType,
      size: body.size,
      originalName: body.fileName,
      uploadUrl: signed.uploadUrl
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to prepare file upload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
