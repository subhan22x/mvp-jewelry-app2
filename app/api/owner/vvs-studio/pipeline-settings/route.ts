import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { canManageVvsPipelineSettings, getVvsPipelineSettings, patchVvsPipelineSettings } from "@/src/lib/vvs-studio/pipeline-settings";

const ProfileOverride = z.object({
  modelId: z.string().min(1).optional(),
  promptTemplate: z.string().min(1).optional(),
  trafficWeight: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
  params: z.record(z.unknown()).optional(),
});

const StyleOverride = z.object({
  label: z.string().min(1).optional(),
  active: z.boolean().optional(),
  backgroundAsset: z.string().min(1).optional(),
  placementPrompt: z.string().min(1).optional(),
  previewAsset: z.string().min(1).optional(),
});

const PatchBody = z.object({
  profiles: z.record(ProfileOverride).optional(),
  styles: z.record(StyleOverride).optional(),
});

export async function GET() {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageVvsPipelineSettings(owner.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const settings = await getVvsPipelineSettings(owner.accountId);
  return NextResponse.json({ settings });
}

export async function PATCH(req: Request) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!canManageVvsPipelineSettings(owner.email)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    const body = PatchBody.parse(await req.json());
    const settings = await patchVvsPipelineSettings(owner.accountId, body);
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed." }, { status: 400 });
  }
}
