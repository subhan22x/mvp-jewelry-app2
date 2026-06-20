import { notFound } from "next/navigation";
import { prisma } from "@/server/db/client";
import { requireOwnerContext } from "@/src/lib/auth/owner-context";
import OwnerFrame from "../../../OwnerFrame";
import QuoteMediaStep from "./QuoteMediaStep";

export const dynamic = "force-dynamic";

export default async function QuoteMediaPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const { accountId } = await requireOwnerContext();
  const quote = await prisma.quoteRequest.findFirst({
    where: { id: quoteId, accountId },
    include: {
      request: { select: { productType: true, text: true } },
      video: { select: { id: true, status: true, error: true } },
      model3d: { select: { id: true, status: true, error: true } }
    }
  });
  if (!quote) notFound();
  if (!quote.publicToken || quote.status === "pending") notFound();

  const productType = quote.productType ?? quote.request?.productType ?? "custom";
  const canGenerateEnhancedMedia = productType === "name";

  return (
    <OwnerFrame active="Quotes">
      <div className="mx-auto w-full max-w-4xl px-4 md:px-6">
        <QuoteMediaStep
          quoteId={quote.id}
          title={quote.text ?? quote.request?.text ?? "Custom jewelry"}
          imageUrl={quote.designedImageUrl}
          canGenerate3d={canGenerateEnhancedMedia}
          canGenerateVideo={canGenerateEnhancedMedia}
          initialMediaType={quote.previewMediaType === "model3d" || quote.previewMediaType === "video" ? quote.previewMediaType : "image"}
          initialModelJob={quote.model3d}
          initialVideoJob={quote.video}
        />
      </div>
    </OwnerFrame>
  );
}
