import { notFound } from "next/navigation";
import { prisma } from "@/server/db/client";
import { requireOwnerContext } from "@/src/lib/auth/owner-context";
import OwnerFrame from "../../../OwnerFrame";
import QuotePreparationForm, { type QuoteImageOption } from "./QuotePreparationForm";
import { quoteSelectionDefaults } from "@/src/lib/quotes/quote-selection-defaults";

export const dynamic = "force-dynamic";

export default async function PrepareQuotePage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const { accountId } = await requireOwnerContext();
  const quote = await prisma.quoteRequest.findFirst({
    where: { id: quoteId, accountId },
    include: {
      request: {
        include: {
          Results: {
            where: { status: "succeeded", imageUrl: { not: null } },
            orderBy: { variant: "asc" }
          },
          ResultRevisions: {
            where: { status: "succeeded", imageUrl: { not: null } },
            orderBy: [{ sourceResultId: "asc" }, { revisionNumber: "asc" }]
          }
        }
      }
    }
  });
  if (!quote) notFound();

  const imageOptions: QuoteImageOption[] = [];
  for (const result of quote.request?.Results ?? []) {
    if (!result.imageUrl) continue;
    imageOptions.push({
      key: `result:${result.id}`,
      kind: "result",
      id: result.id,
      sourceResultId: result.id,
      imageUrl: result.imageUrl,
      label: `Draft ${result.variant}`
    });
  }
  for (const revision of quote.request?.ResultRevisions ?? []) {
    if (!revision.imageUrl) continue;
    const source = quote.request?.Results.find(result => result.id === revision.sourceResultId);
    imageOptions.push({
      key: `revision:${revision.id}`,
      kind: "revision",
      id: revision.id,
      sourceResultId: revision.sourceResultId,
      imageUrl: revision.imageUrl,
      label: `Draft ${source?.variant ?? ""} revision ${revision.revisionNumber}`.replace("Draft  revision", "Revision")
    });
  }

  const selectedKey = quote.resultRevisionId
    ? `revision:${quote.resultRevisionId}`
    : quote.resultId
      ? `result:${quote.resultId}`
      : imageOptions[0]?.key ?? null;
  const selectionDefaults = quoteSelectionDefaults({
    quoteMaterial: quote.quoteMaterial,
    quoteMaterialKarat: quote.quoteMaterialKarat,
    quoteStoneType: quote.quoteStoneType,
    metalType: quote.metalType ?? quote.request?.metalType ?? null,
    stoneType: quote.stoneType ?? quote.request?.stoneType ?? null,
    plainMetal: quote.plainMetal ?? quote.request?.plainMetal ?? null,
    plainKarat: quote.plainKarat ?? quote.request?.plainKarat ?? null,
    primaryMetal: quote.primaryMetal ?? quote.request?.primaryMetal ?? null,
    pendantFinish: quote.pendantFinish ?? quote.request?.pendantFinish ?? null
  });

  return (
    <OwnerFrame active="Quotes">
      <div className="mx-auto w-full max-w-5xl px-4 md:px-6">
        <QuotePreparationForm
          quote={{
            id: quote.id,
            customerName: quote.customerName,
            customerPhone: quote.customerPhone,
            customerEmail: quote.customerEmail,
            productType: quote.productType ?? quote.request?.productType ?? null,
            text: quote.text ?? quote.request?.text ?? null,
            styleId: quote.styleId ?? quote.request?.styleId ?? null,
            quotedPriceCents: quote.quotedPriceCents,
            quoteNotes: quote.quoteNotes,
            estimatedDelivery: quote.estimatedDelivery,
            quoteMaterial: selectionDefaults.material,
            quoteMaterialKarat: selectionDefaults.materialKarat,
            quoteStoneType: selectionDefaults.stoneType,
            designedImageUrl: quote.designedImageUrl
          }}
          imageOptions={imageOptions}
          initialSelectedKey={selectedKey}
        />
      </div>
    </OwnerFrame>
  );
}
