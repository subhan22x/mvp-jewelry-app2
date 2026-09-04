import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformAdminContext } from "@/src/lib/auth/platform-admin";
import { changeQrKitStatus } from "@/src/lib/qr-kits/service";

const Body = z.object({
  status: z.enum(["suspended", "lost", "retired"]),
  reason: z.string().trim().max(400).optional()
});

export async function POST(req: Request, { params }: { params: Promise<{ qrKitId: string }> }) {
  const admin = await getPlatformAdminContext();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const [{ qrKitId }, body] = await Promise.all([params, req.json().then(value => Body.parse(value))]);
    const kit = await changeQrKitStatus({ qrKitId, ...body, actorUserId: admin.userId });
    return NextResponse.json({ kit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update QR kit.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
