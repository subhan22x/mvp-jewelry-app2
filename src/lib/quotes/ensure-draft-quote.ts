import { Prisma, type Result } from "@prisma/client";
import { prisma } from "@/server/db/client";

export type EnsureDraftQuoteResult =
  | { ok: false; reason: "request_not_found" | "not_eligible" }
  | { ok: true; quoteRequestId: string; created: boolean };

function hasImage(result: Pick<Result, "imageUrl">): boolean {
  return Boolean(result.imageUrl);
}

function pickPreferredResult(results: Result[]): Result {
  return (
    results.find(result => result.variant === 1 && hasImage(result)) ??
    results.find(result => hasImage(result)) ??
    results[0]
  );
}

export async function ensureDraftQuoteForRequest(requestId: string): Promise<EnsureDraftQuoteResult> {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { Results: { orderBy: { variant: "asc" } } }
  });
  if (!request) return { ok: false, reason: "request_not_found" };

  const succeeded = request.Results.filter(result => result.status === "succeeded" && hasImage(result));
  if (succeeded.length === 0) return { ok: false, reason: "not_eligible" };

  const lead = await prisma.lead.findFirst({
    where: {
      accountId: request.accountId,
      requestId: request.id,
      name: { not: "" },
      phone: { not: "" },
      email: { not: "" }
    },
    orderBy: { createdAt: "desc" }
  });
  if (!lead) return { ok: false, reason: "not_eligible" };

  const existing = await prisma.quoteRequest.findFirst({
    where: { requestId: request.id },
    select: { id: true }
  });
  if (existing) return { ok: true, quoteRequestId: existing.id, created: false };

  const preferred = pickPreferredResult(succeeded);

  try {
    const created = await prisma.quoteRequest.create({
      data: {
        accountId: request.accountId,
        requestId: request.id,
        resultId: preferred.id,
        designedImageUrl: preferred.imageUrl ?? null,
        generatedAt: preferred.completedAt ?? preferred.createdAt ?? request.createdAt,
        productType: request.productType,
        pendantFinish: request.pendantFinish,
        styleId: request.styleId,
        text: request.text,
        twoTone: request.twoTone,
        primaryMetal: request.primaryMetal,
        secondaryMetal: request.secondaryMetal,
        emblem: request.emblem,
        size: request.size,
        metalType: request.metalType,
        stoneType: request.stoneType,
        diamondQuality: request.diamondQuality,
        budgetMinCents: request.budgetMinCents,
        budgetMaxCents: request.budgetMaxCents,
        plainColor: request.plainColor,
        plainMetal: request.plainMetal,
        plainKarat: request.plainKarat,
        plainChain: request.plainChain,
        customerName: lead.name,
        customerPhone: lead.phone,
        customerEmail: lead.email,
        previewMediaType: "image",
        status: "pending"
      }
    });
    return { ok: true, quoteRequestId: created.id, created: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existingAfterRace = await prisma.quoteRequest.findFirst({
        where: { requestId: request.id },
        select: { id: true }
      });
      if (existingAfterRace) {
        return { ok: true, quoteRequestId: existingAfterRace.id, created: false };
      }
    }
    throw error;
  }
}
