import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformAdminContext } from "@/src/lib/auth/platform-admin";
import { assignQrKit } from "@/src/lib/qr-kits/service";

const Body = z.object({ accountId: z.string().cuid() });

export async function POST(req: Request, { params }: { params: Promise<{ qrKitId: string }> }) {
  const admin = await getPlatformAdminContext();
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const [{ qrKitId }, body] = await Promise.all([params, req.json().then(value => Body.parse(value))]);
    const kit = await assignQrKit({ qrKitId, accountId: body.accountId, actorUserId: admin.userId });
    return NextResponse.json({ kit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to assign QR kit.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
