import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/client";
import { requireOwnerContext } from "@/src/lib/auth/owner-context";
import { proxiedOwnerModelUrl } from "@/src/lib/model3d/proxy";
import CustomerQuoteCard from "@/app/components/quote/CustomerQuoteCard";
import type { QuotePreviewMediaType } from "@/app/components/quote/QuoteMediaViewer";
import OwnerFrame from "../../../OwnerFrame";
import QuoteShareActions from "./QuoteShareActions";
import { quoteMaterialLabel, quoteStoneLabel } from "@/src/lib/quotes/quote-message";

export const dynamic = "force-dynamic";

function publicQuoteUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL;
  return base ? `${base.replace(/\/+$/, "")}/q/${token}` : `/q/${token}`;
}

function cleanLabel(value: string | null | undefined) {
  if (!value) return null;
  return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function metalColors(quote: { primaryMetal: string | null; secondaryMetal: string | null; plainColor: string | null }) {
  const values = [quote.primaryMetal, quote.secondaryMetal]
    .filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index)
    .map(value => cleanLabel(value));
  return values.join(" + ") || cleanLabel(quote.plainColor);
}

function estimatedCost(cents: number | null) {
  if (typeof cents !== "number") return "Contact store";
  const hasCents = cents % 100 !== 0;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0
  });
}

export default async function OwnerQuotePreviewPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const { accountId } = await requireOwnerContext();
  const quote = await prisma.quoteRequest.findFirst({
    where: { id: quoteId, accountId },
    include: {
      account: {
        select: {
          name: true,
          StoreProfile: { select: { displayName: true, profileImageUrl: true } }
        }
      },
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
  const storeName = quote.account.StoreProfile?.displayName || quote.account.name;

  return (
    <OwnerFrame active="Quotes">
      <div className="mx-auto flex w-full max-w-[660px] flex-col items-center px-1 md:px-6">
        <div className="mb-4 w-full max-w-[430px] md:max-w-[560px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#D1B873] md:text-xs">Quote preview</p>
          <p className="mt-1 text-xs text-[#c2c6d6] md:text-sm">Prepared for {quote.customerName}</p>
        </div>

        <CustomerQuoteCard
          storeName={storeName}
          storeProfileImageUrl={quote.account.StoreProfile?.profileImageUrl}
          imageUrl={quote.designedImageUrl}
          previewMediaType={mediaType}
          modelUrl={modelUrl}
          videoUrl={videoUrl}
          imageAlt={`${title} quoted design`}
          estimatedDelivery={quote.estimatedDelivery}
          quotedMaterial={quoteMaterialLabel(quote.quoteMaterial, quote.quoteMaterialKarat)}
          quotedStone={quoteStoneLabel(quote.quoteStoneType)}
          metalColors={metalColors(quote)}
          estimatedCost={estimatedCost(quote.quotedPriceCents)}
          quoteNotes={quote.quoteNotes}
        />

        <section className="mt-4 w-full max-w-[430px] rounded-2xl border border-white/5 bg-[#17191F] p-4 md:max-w-[560px] md:p-6">
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
