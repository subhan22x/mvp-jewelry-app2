import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { fetchModelResponse, MODEL3D_CONTENT_TYPE } from "@/src/lib/model3d/proxy";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await getOwnerContext();
  if (!owner) return new Response("Unauthorized.", { status: 401 });

  const model = await prisma.model3dGeneration.findFirst({
    where: { id, accountId: owner.accountId, status: "succeeded", modelUrl: { not: null } },
    select: { modelUrl: true }
  });

  if (!model?.modelUrl) return new Response("not_found", { status: 404 });
  return fetchModelResponse(model.modelUrl, req);
}

export async function HEAD(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await getOwnerContext();
  if (!owner) return new Response(null, { status: 401 });

  const model = await prisma.model3dGeneration.findFirst({
    where: { id, accountId: owner.accountId, status: "succeeded", modelUrl: { not: null } },
    select: { id: true }
  });

  if (!model) return new Response(null, { status: 404 });
  return new Response(null, {
    status: 200,
    headers: {
      "Content-Type": MODEL3D_CONTENT_TYPE,
      "Cache-Control": "private, max-age=300"
    }
  });
}
