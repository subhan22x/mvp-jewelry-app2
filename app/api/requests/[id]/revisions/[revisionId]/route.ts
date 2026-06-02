import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";

function toSeconds(durationMs: number | null) {
  return typeof durationMs === "number" ? Number((durationMs / 1000).toFixed(2)) : null;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string; revisionId: string }> }) {
  const { id, revisionId } = await params;
  const revision = await prisma.resultRevision.findUnique({
    where: { id: revisionId }
  });

  if (!revision || revision.requestId !== id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: revision.id,
    requestId: revision.requestId,
    sourceResultId: revision.sourceResultId,
    revisionNumber: revision.revisionNumber,
    prompt: revision.prompt,
    imageUrl: revision.imageUrl,
    status: revision.status,
    error: revision.error,
    modelId: revision.modelId,
    durationMs: revision.durationMs,
    durationSeconds: toSeconds(revision.durationMs),
    done: revision.status === "succeeded" || revision.status === "failed"
  });
}
