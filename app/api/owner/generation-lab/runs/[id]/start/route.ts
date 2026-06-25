import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { scheduleBackgroundTask } from "@/src/lib/platform/background";
import { runLabRun } from "@/src/lib/generation-lab/runner";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const run = await prisma.generationLabRun.findUnique({
    where: { id },
    include: { Cases: { orderBy: { sortOrder: "asc" } } }
  });
  if (!run || run.accountId !== owner.accountId) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }
  if (run.status === "running") {
    return NextResponse.json({ error: "Run is already running." }, { status: 409 });
  }
  if (run.Cases.length === 0) {
    return NextResponse.json({ error: "Add at least one case before starting." }, { status: 400 });
  }

  // Reset any previously-run cases back to pending so re-runs are explicit.
  await prisma.generationLabCase.updateMany({
    where: { runId: run.id, status: { in: ["succeeded", "partial", "failed", "skipped"] } },
    data: { status: "pending", error: null, startedAt: null, completedAt: null }
  });

  scheduleBackgroundTask(runLabRun({ runId: run.id, accountId: owner.accountId, userId: owner.userId }), `generation-lab:${run.id}`);

  return NextResponse.json({ id: run.id, status: "running" });
}
