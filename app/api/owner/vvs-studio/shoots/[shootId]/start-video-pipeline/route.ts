import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { processNextVvsStudioJob, startVvsVideoPipeline } from "@/src/lib/vvs-studio/pipeline";

export const maxDuration = 60;

type Ctx = { params: Promise<{ shootId: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const { shootId } = await params;
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const job = await startVvsVideoPipeline({ accountId: owner.accountId, shootId });
    const nudge = processNextVvsStudioJob().catch(error => {
      console.error(`[vvs pipeline ${job.id}] nudge failed:`, error);
    });
    if (process.env.VERCEL) waitUntil(nudge);
    else void nudge;

    return NextResponse.json({ jobId: job.id, status: job.status, currentStage: job.currentStage }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to start VVS video pipeline." }, { status: 400 });
  }
}
