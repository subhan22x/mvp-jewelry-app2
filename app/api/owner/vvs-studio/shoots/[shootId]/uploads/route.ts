import { NextResponse } from "next/server";
import sharp from "sharp";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import { saveVvsSourceUpload } from "@/src/lib/vvs-studio/source-storage";

type Ctx = { params: { shootId: string } };

const VALID_ANGLES = ["top", "left", "right"] as const;
type Angle = (typeof VALID_ANGLES)[number];
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

async function findShoot(shootId: string) {
  const accountId = getDefaultAccountId();
  const shoot = await prisma.vvsStudioShoot.findUnique({ where: { id: shootId } });
  if (!shoot || shoot.accountId !== accountId) return null;
  return shoot;
}

function detectedImageType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return "image/png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1", "heif"].includes(brand)) return "image/heic";
  }
  return null;
}

function isCompatibleMime(declared: string, detected: string) {
  if (declared === detected) return true;
  if ((declared === "image/heic" || declared === "image/heif") && detected === "image/heic") return true;
  return false;
}

export async function POST(req: Request, { params }: Ctx) {
  const shoot = await findShoot(params.shootId);
  if (!shoot) return NextResponse.json({ error: "Shoot not found." }, { status: 404 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const angle = formData.get("angle") as string | null;

    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (!angle || !VALID_ANGLES.includes(angle as Angle)) {
      return NextResponse.json({ error: "angle must be top, left, or right." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image must be 15 MB or smaller." }, { status: 413 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Upload must be JPEG, PNG, WebP, HEIC, or HEIF." }, { status: 415 });
    }

    const originalBuffer = Buffer.from(await file.arrayBuffer());
    const detectedType = detectedImageType(originalBuffer);
    if (!detectedType || !isCompatibleMime(file.type, detectedType)) {
      return NextResponse.json({ error: "Image file type does not match its contents." }, { status: 415 });
    }

    const normalizedBuffer = await sharp(originalBuffer)
      .rotate()
      .jpeg({ quality: 92 })
      .toBuffer();

    const meta = await sharp(normalizedBuffer).metadata();
    const uploadId = crypto.randomUUID();
    const stored = await saveVvsSourceUpload({
      buffer: normalizedBuffer,
      accountId: shoot.accountId,
      shootId: shoot.id,
      angle,
      uploadId,
    });

    // Upsert so replacing an angle overwrites the previous upload row
    const existing = await prisma.vvsStudioUpload.findUnique({
      where: { shootId_angle: { shootId: shoot.id, angle } },
    });

    const upload = existing
      ? await prisma.vvsStudioUpload.update({
          where: { id: existing.id },
          data: {
            storageKey: stored.storageKey,
            imageUrl: stored.imageUrl,
            originalContentType: file.type,
            normalizedContentType: "image/jpeg",
            fileSize: normalizedBuffer.byteLength,
            width: meta.width,
            height: meta.height,
          },
        })
      : await prisma.vvsStudioUpload.create({
          data: {
            id: uploadId,
            accountId: shoot.accountId,
            shootId: shoot.id,
            angle,
            storageKey: stored.storageKey,
            imageUrl: stored.imageUrl,
            originalContentType: file.type,
            normalizedContentType: "image/jpeg",
            fileSize: normalizedBuffer.byteLength,
            width: meta.width,
            height: meta.height,
          },
        });

    return NextResponse.json({ uploadId: upload.id, imageUrl: upload.imageUrl }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    const status = /unsupported|heif|heic|input file|decode|format/i.test(message) ? 415 : 500;
    return NextResponse.json({ error: status === 415 ? "Image could not be decoded or converted on this server." : message }, { status });
  }
}
