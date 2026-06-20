import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { proxiedOwnerModelUrl } from "@/src/lib/model3d/proxy";

function toSeconds(durationMs: number | null) {
  return typeof durationMs === "number" ? Number((durationMs / 1000).toFixed(2)) : null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await getOwnerContext();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const accountId = owner.accountId;
  const model = await prisma.model3dGeneration.findFirst({
    where: { id, accountId },
    include: {
      request: {
        select: {
          id: true,
          productType: true,
          styleId: true,
          text: true,
          primaryMetal: true,
          secondaryMetal: true,
          emblem: true
        }
      }
    }
  });

  if (!model) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    id: model.id,
    requestId: model.requestId,
    sourceResultId: model.sourceResultId,
    sourceImageUrl: model.sourceImageUrl,
    modelUrl: proxiedOwnerModelUrl(model.id, Boolean(model.modelUrl)),
    remoteModelUrl: model.remoteModelUrl,
    format: model.format,
    modelId: model.modelId,
    providerJobId: model.providerJobId,
    status: model.status,
    error: model.error,
    durationMs: model.durationMs,
    durationSeconds: toSeconds(model.durationMs),
    done: model.status === "succeeded" || model.status === "failed",
    request: model.request
  });
}
