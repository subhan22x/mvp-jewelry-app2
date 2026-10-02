import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformAdminContext } from "@/src/lib/auth/platform-admin";
import { createQrKitBatch } from "@/src/lib/qr-kits/service";

const Body = z.object({
  code: z.string().trim().min(2).max(31),
  label: z.string().trim().min(1).max(120),
  printTemplateVersion: z.string().trim().min(1).max(80),
  quantity: z.number().int().min(1).max(100)
});

export async function POST(req: Request) {
  const admin = await getPlatformAdminContext();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const body = Body.parse(await req.json());
    const result = await createQrKitBatch({ ...body, actorUserId: admin.userId });
    return NextResponse.json({ batch: result.batch, kits: result.kits }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create QR kit batch.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
