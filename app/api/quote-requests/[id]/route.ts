import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { consumeUsageCredit, usageErrorResponse } from "@/src/lib/usage";

const Body = z.object({
  resultId: z.string().min(1).nullable().optional(),
  resultRevisionId: z.string().min(1).nullable().optional(),
  quotedPriceCents: z.number().int().nonnegative().optional(),
  quoteNotes: z.string().max(2000).optional(),
  estimatedDelivery: z.string().max(120).optional().nullable(),
  quoteMaterial: z.string().max(80).optional().nullable(),
  quoteMaterialKarat: z.string().max(20).optional().nullable(),
  quoteStoneType: z.string().max(80).optional().nullable(),
  previewMediaType: z.enum(["image", "model3d", "video"]).optional(),
  status: z.enum(["pending", "priced", "sent", "fulfilled", "closed"]).optional()
});

function cleanOptional(value: string | null | undefined) {
  return value?.trim() || null;
}

function publicBaseUrl(req: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/+$/, "");

  try {
    return new URL(req.url).origin;
  } catch {
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return "";
}

function publicQuoteUrl(req: Request, token: string | null) {
  if (!token) return null;
  const baseUrl = publicBaseUrl(req);
  return baseUrl ? `${baseUrl}/q/${token}` : `/q/${token}`;
}

function createPublicToken() {
  return randomBytes(24).toString("base64url");
}

async function updateQuoteWithPublicToken(id: string, data: Record<string, unknown>, needsPublicToken: boolean) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.quoteRequest.update({
        where: { id },
        data: needsPublicToken
          ? { ...data, publicToken: createPublicToken(), publicTokenCreatedAt: new Date() }
          : data
      });
    } catch (error) {
      const isPublicTokenCollision = error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === "P2002"
        && Array.isArray(error.meta?.target)
        && error.meta.target.includes("publicToken");
      if (!isPublicTokenCollision || attempt === 2) throw error;
    }
  }

  throw new Error("Unable to create a public quote link.");
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await getOwnerContext();
  if (!owner) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = Body.parse(await req.json());
    const accountId = owner.accountId;
    const existing = await prisma.quoteRequest.findFirst({
      where: { id, accountId },
      select: {
        id: true,
        requestId: true,
        status: true,
        publicToken: true,
        resultId: true,
        resultRevisionId: true,
        previewMediaType: true,
        videoId: true,
        model3dId: true
      }
    });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (body.resultId && body.resultRevisionId) {
      return NextResponse.json({ error: "Choose either an original generation or a revision, not both." }, { status: 400 });
    }

    let selectedMediaData: Record<string, unknown> = {};
    if (body.resultRevisionId !== undefined) {
      if (!body.resultRevisionId || !existing.requestId) {
        return NextResponse.json({ error: "A generated revision is required." }, { status: 400 });
      }
      const revision = await prisma.resultRevision.findFirst({
        where: {
          id: body.resultRevisionId,
          accountId,
          requestId: existing.requestId,
          status: "succeeded",
          imageUrl: { not: null }
        },
        select: {
          id: true,
          sourceResultId: true,
          imageUrl: true,
          completedAt: true,
          createdAt: true
        }
      });
      if (!revision?.imageUrl) {
        return NextResponse.json({ error: "The selected revision is not available for this quote." }, { status: 400 });
      }
      const selectionChanged = existing.resultRevisionId !== revision.id;
      selectedMediaData = {
        resultId: revision.sourceResultId,
        resultRevisionId: revision.id,
        designedImageUrl: revision.imageUrl,
        generatedAt: revision.completedAt ?? revision.createdAt,
        ...(selectionChanged ? {
          previewMediaType: "image",
          model3dId: null,
          videoId: null,
          videoUrl: null
        } : {})
      };
    } else if (body.resultId !== undefined) {
      if (!body.resultId || !existing.requestId) {
        return NextResponse.json({ error: "A generated image is required." }, { status: 400 });
      }
      const result = await prisma.result.findFirst({
        where: {
          id: body.resultId,
          accountId,
          requestId: existing.requestId,
          status: "succeeded",
          imageUrl: { not: null }
        },
        select: { id: true, imageUrl: true, completedAt: true, createdAt: true }
      });
      if (!result?.imageUrl) {
        return NextResponse.json({ error: "The selected generation is not available for this quote." }, { status: 400 });
      }
      const selectionChanged = existing.resultId !== result.id || existing.resultRevisionId !== null;
      selectedMediaData = {
        resultId: result.id,
        resultRevisionId: null,
        designedImageUrl: result.imageUrl,
        generatedAt: result.completedAt ?? result.createdAt,
        ...(selectionChanged ? {
          previewMediaType: "image",
          model3dId: null,
          videoId: null,
          videoUrl: null
        } : {})
      };
    }

    const nextPreviewMediaType = body.previewMediaType ?? existing.previewMediaType;
    if (body.status === "sent" && nextPreviewMediaType === "model3d") {
      const model = existing.model3dId
        ? await prisma.model3dGeneration.findFirst({
            where: { id: existing.model3dId, accountId, status: "succeeded", modelUrl: { not: null } },
            select: { id: true }
          })
        : null;
      if (!model) {
        return NextResponse.json({ error: "The selected 3D preview must finish before this quote can be shared." }, { status: 409 });
      }
    }
    if (body.status === "sent" && nextPreviewMediaType === "video") {
      const video = existing.videoId
        ? await prisma.videoGeneration.findFirst({
            where: { id: existing.videoId, accountId, status: "succeeded", videoUrl: { not: null } },
            select: { id: true }
          })
        : null;
      if (!video) {
        return NextResponse.json({ error: "The selected video must finish before this quote can be shared." }, { status: 409 });
      }
    }

    const data = {
      ...selectedMediaData,
      quotedPriceCents: body.quotedPriceCents,
      quoteNotes: body.quoteNotes,
      status: body.status,
      ...(body.previewMediaType !== undefined ? { previewMediaType: body.previewMediaType } : {}),
      ...(body.estimatedDelivery !== undefined ? { estimatedDelivery: cleanOptional(body.estimatedDelivery) } : {}),
      ...(body.quoteMaterial !== undefined ? { quoteMaterial: cleanOptional(body.quoteMaterial) } : {}),
      ...(body.quoteMaterialKarat !== undefined ? { quoteMaterialKarat: cleanOptional(body.quoteMaterialKarat) } : {}),
      ...(body.quoteStoneType !== undefined ? { quoteStoneType: cleanOptional(body.quoteStoneType) } : {}),
    };

    const needsPublicToken = (body.status === "priced" || body.status === "sent") && !existing.publicToken;
    const quoteRequest = await updateQuoteWithPublicToken(id, data, needsPublicToken);
    if (existing.status !== "sent" && body.status === "sent") {
      await consumeUsageCredit({
        accountId,
        kind: "quote_responded",
        sourceType: "QuoteRequest",
        sourceId: quoteRequest.id
      });
    }
    if (existing.status !== "fulfilled" && body.status === "fulfilled") {
      await consumeUsageCredit({
        accountId,
        kind: "quote_fulfilled",
        sourceType: "QuoteRequest",
        sourceId: quoteRequest.id
      });
    }

    return NextResponse.json({
      id: quoteRequest.id,
      quotedPriceCents: quoteRequest.quotedPriceCents,
      quoteNotes: quoteRequest.quoteNotes,
      estimatedDelivery: quoteRequest.estimatedDelivery,
      quoteMaterial: quoteRequest.quoteMaterial,
      quoteMaterialKarat: quoteRequest.quoteMaterialKarat,
      quoteStoneType: quoteRequest.quoteStoneType,
      resultId: quoteRequest.resultId,
      resultRevisionId: quoteRequest.resultRevisionId,
      previewMediaType: quoteRequest.previewMediaType,
      status: quoteRequest.status,
      publicQuoteUrl: publicQuoteUrl(req, quoteRequest.publicToken)
    });
  } catch (err) {
    const usage = usageErrorResponse(err);
    if (usage) return NextResponse.json(usage, { status: 402 });
    const message = err instanceof Error ? err.message : "bad_request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
