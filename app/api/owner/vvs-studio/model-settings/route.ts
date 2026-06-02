import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { getVvsModelSettings, patchVvsModelSettings } from "@/src/lib/vvs-studio/model-settings";

const PatchBody = z.object({
  imageProvider: z.enum(["openai", "gemini"]).optional(),
  geminiImageModel: z.string().min(1).optional(),
  openaiImageModel: z.string().min(1).optional(),
  videoProvider: z.string().min(1).optional(),
  wavespeedVideoModel: z.string().min(1).optional(),
});

export async function GET() {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const accountId = owner.accountId;
  const settings = await getVvsModelSettings(accountId);
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const accountId = owner.accountId;
  try {
    const body = PatchBody.parse(await req.json());
    await patchVvsModelSettings(accountId, body);
    const settings = await getVvsModelSettings(accountId);
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed." }, { status: 400 });
  }
}
