import { prisma } from "@/server/db/client";
import { fetchModelResponse, MODEL3D_CONTENT_TYPE } from "@/src/lib/model3d/proxy";

const PUBLIC_STATUSES = new Set(["sent", "fulfilled", "closed"]);

async function findPublicQuoteModel(token: string) {
  const quote = await prisma.quoteRequest.findUnique({
    where: { publicToken: token },
    select: {
      accountId: true,
      model3dId: true,
      previewMediaType: true,
      status: true
    }
  });

  if (!quote || !PUBLIC_STATUSES.has(quote.status) || quote.previewMediaType !== "model3d" || !quote.model3dId) return null;

  return prisma.model3dGeneration.findFirst({
    where: {
      accountId: quote.accountId,
      id: quote.model3dId,
      status: "succeeded",
      modelUrl: { not: null }
    },
    orderBy: { createdAt: "desc" },
    select: { modelUrl: true }
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const model = await findPublicQuoteModel(token);
  if (!model?.modelUrl) return new Response("not_found", { status: 404 });
  return fetchModelResponse(model.modelUrl, req);
}

export async function HEAD(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const model = await findPublicQuoteModel(token);
  if (!model?.modelUrl) return new Response(null, { status: 404 });
  return new Response(null, {
    status: 200,
    headers: {
      "Content-Type": MODEL3D_CONTENT_TYPE,
      "Cache-Control": "private, max-age=300"
    }
  });
}
