import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { processVvsStudioJobsUntilIdle, startVvsImagePostPipeline } from "@/src/lib/vvs-studio/pipeline";
import { usageErrorResponse } from "@/src/lib/usage";

export const maxDuration = 300;

type Ctx = { params: Promise<{ shootId: string }> };

export async function POST(_req: Request, { params }: Ctx) {
  const { shootId } = await params;
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const job = await startVvsImagePostPipeline({ accountId: owner.accountId, shootId });
    const worker = processVvsStudioJobsUntilIdle(240_000).catch(error => {
      console.error(`[vvs image pipeline ${job.id}] worker failed:`, error);
    });
    if (process.env.VERCEL) waitUntil(worker);
    else void worker;

    return NextResponse.json({ jobId: job.id, status: job.status, currentStage: job.currentStage }, { status: 201 });
  } catch (error) {
    const usage = usageErrorResponse(error);
    if (usage) return NextResponse.json(usage, { status: 402 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to start VVS image pipeline." }, { status: 400 });
  }
}
