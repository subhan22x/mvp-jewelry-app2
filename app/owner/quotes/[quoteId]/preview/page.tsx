import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/client";
import { requireOwnerContext } from "@/src/lib/auth/owner-context";
import { proxiedOwnerModelUrl } from "@/src/lib/model3d/proxy";
import QuoteMediaViewer, { type QuotePreviewMediaType } from "@/app/components/quote/QuoteMediaViewer";
import OwnerFrame from "../../../OwnerFrame";
import QuoteShareActions from "./QuoteShareActions";
import { quoteMaterialLabel, quoteStoneLabel } from "@/src/lib/quotes/quote-message";

export const dynamic = "force-dynamic";

function publicQuoteUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL;
  return base ? `${base.replace(/\/+$/, "")}/q/${token}` : `/q/${token}`;
}

export default async function OwnerQuotePreviewPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const { accountId } = await requireOwnerContext();
  const quote = await prisma.quoteRequest.findFirst({
    where: { id: quoteId, accountId },
    include: {
      model3d: { select: { id: true, status: true, modelUrl: true } },
      video: { select: { id: true, status: true, videoUrl: true } }
    }
  });
  if (!quote || quote.status === "pending" || quote.status === "priced" || !quote.publicToken) notFound();

  const mediaType: QuotePreviewMediaType = quote.previewMediaType === "model3d" || quote.previewMediaType === "video" ? quote.previewMediaType : "image";
  const modelUrl = mediaType === "model3d" && quote.model3d?.status === "succeeded" && quote.model3d.modelUrl
    ? proxiedOwnerModelUrl(quote.model3d.id, true)
    : null;
  const videoUrl = mediaType === "video" && quote.video?.status === "succeeded" ? quote.video.videoUrl : null;
  const shareUrl = publicQuoteUrl(quote.publicToken);
  const title = quote.text || "Custom jewelry";
  const quoteDetails = [
    { label: "Estimated delivery", value: quote.estimatedDelivery },
    { label: "Material", value: quoteMaterialLabel(quote.quoteMaterial, quote.quoteMaterialKarat) },
    { label: "Stone", value: quoteStoneLabel(quote.quoteStoneType) }
  ].filter(detail => detail.value);

  return (
    <OwnerFrame active="Quotes">
      <div className="mx-auto grid w-full max-w-md gap-4 px-1 md:max-w-6xl md:gap-6 md:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section>
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#D1B873] md:text-xs">Quote preview</p>
          <QuoteMediaViewer imageUrl={quote.designedImageUrl} previewMediaType={mediaType} modelUrl={modelUrl} videoUrl={videoUrl} alt={`${title} quoted design`} compact />
        </section>
        <section className="rounded-2xl border border-white/5 bg-[#17191F] p-4 md:p-6">
          <h1 className="break-words text-2xl font-bold text-white md:text-3xl">{title}</h1>
          <p className="mt-1.5 text-xs text-[#c2c6d6] md:text-sm">Prepared for {quote.customerName}</p>
          {quote.quoteNotes ? <p className="mt-3 whitespace-pre-wrap rounded-2xl border border-white/5 bg-black/20 p-3 text-xs leading-5 text-[#d7d9e2] md:p-4 md:text-sm md:leading-6">{quote.quoteNotes}</p> : null}
          {quoteDetails.length > 0 ? (
            <dl className="mt-3 grid gap-2 sm:grid-cols-2 md:mt-4 md:gap-3">
              {quoteDetails.map(detail => (
                <div key={detail.label} className="min-w-0 rounded-2xl border border-white/5 bg-black/20 p-3 md:p-4">
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8c909f]">{detail.label}</dt>
                  <dd className="mt-1 break-words text-sm font-semibold text-white">{detail.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <QuoteShareActions
            customerPhone={quote.customerPhone}
            customerName={quote.customerName}
            quoteUrl={shareUrl}
            quotedPriceCents={quote.quotedPriceCents}
            estimatedDelivery={quote.estimatedDelivery}
            quoteMaterial={quote.quoteMaterial}
            quoteMaterialKarat={quote.quoteMaterialKarat}
            quoteStoneType={quote.quoteStoneType}
            quoteNotes={quote.quoteNotes}
          />
          <Link href={`/owner/quotes/${quote.id}/prepare`} className="mt-2 block rounded-2xl border border-white/10 px-5 py-2.5 text-center text-sm font-semibold text-white/80 hover:bg-white/5 md:mt-3 md:py-3">Edit Quote</Link>
        </section>
      </div>
    </OwnerFrame>
  );
}
