import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";

function toSeconds(durationMs: number | null) {
  return typeof durationMs === "number" ? Number((durationMs / 1000).toFixed(2)) : null;
}

export async function GET(_: Request, { params }: { params: { id: string; revisionId: string } }) {
  const revision = await prisma.resultRevision.findUnique({
    where: { id: params.revisionId }
  });

  if (!revision || revision.requestId !== params.id) {
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
