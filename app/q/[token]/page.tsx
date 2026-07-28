import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/client";
import { proxiedPublicQuoteModelUrl } from "@/src/lib/model3d/proxy";
import CustomerQuoteCard from "@/app/components/quote/CustomerQuoteCard";
import type { QuotePreviewMediaType } from "./QuoteMediaViewer";
import { quoteMaterialLabel, quoteStoneLabel } from "@/src/lib/quotes/quote-message";

export const dynamic = "force-dynamic";

const PUBLIC_STATUSES = new Set(["sent", "fulfilled", "closed"]);

type QuotePageProps = {
  params: Promise<{ token: string }>;
};

function absoluteUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_BASE_URL;
  if (!baseUrl) return url;
  return new URL(url, baseUrl).toString();
}

function money(cents: number | null) {
  if (typeof cents !== "number") return null;
  const hasCents = cents % 100 !== 0;
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0
  });
}

function cleanLabel(value: string | null | undefined) {
  if (!value) return null;
  return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function designTitle(quote: { text: string | null; productType: string | null; styleId: string | null }) {
  if (quote.text) return quote.text;
  if (quote.productType === "picture") return "Picture pendant";
  if (quote.productType === "grillz") return "Grillz";
  if (quote.productType === "necklace") return "Necklace";
  if (quote.productType === "general_quote") return "Custom jewelry quote";
  return cleanLabel(quote.styleId) ?? "Custom pendant";
}

function metalColors(quote: {
  primaryMetal: string | null;
  secondaryMetal: string | null;
  plainColor: string | null;
}) {
  const values = [quote.primaryMetal, quote.secondaryMetal]
    .filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index)
    .map(value => cleanLabel(value));
  return values.join(" + ") || cleanLabel(quote.plainColor);
}

async function getPublicQuote(token: string) {
  const quote = await prisma.quoteRequest.findUnique({
    where: { publicToken: token },
    include: {
      account: {
        select: {
          name: true,
          StoreProfile: { select: { displayName: true, profileImageUrl: true, isPublished: true } }
        }
      },
      model3d: {
        select: { id: true, modelUrl: true, status: true }
      },
      video: {
        select: { id: true, videoUrl: true, status: true }
      }
    }
  });

  if (!quote || !PUBLIC_STATUSES.has(quote.status)) return null;

  return quote;
}

export async function generateMetadata({ params }: QuotePageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await getPublicQuote(token);
  if (!data) return { title: "Quote unavailable" };

  const storeName = data.account.StoreProfile?.displayName || data.account.name;
  const title = `${storeName} quote for ${designTitle(data)}`;
  const description = data.quotedPriceCents
    ? `Quote total: ${money(data.quotedPriceCents)}`
    : "Your custom jewelry quote is ready.";
  const imageUrl = absoluteUrl(data.designedImageUrl);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: imageUrl ? [{ url: imageUrl, alt: `${designTitle(data)} preview` }] : undefined
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined
    }
  };
}

export default async function PublicQuotePage({ params }: QuotePageProps) {
  const { token } = await params;
  const data = await getPublicQuote(token);
  if (!data) notFound();

  const quote = data;
  const storeName = quote.account.StoreProfile?.displayName || quote.account.name;
  const title = designTitle(quote);
  const imageUrl = absoluteUrl(quote.designedImageUrl);
  const previewMediaType: QuotePreviewMediaType = quote.previewMediaType === "model3d" || quote.previewMediaType === "video"
    ? quote.previewMediaType
    : "image";
  const hasAttachedModel = previewMediaType === "model3d"
    && quote.model3d?.status === "succeeded"
    && Boolean(quote.model3d.modelUrl);
  const modelUrl = proxiedPublicQuoteModelUrl(token, hasAttachedModel);
  const videoUrl = previewMediaType === "video" && quote.video?.status === "succeeded"
    ? absoluteUrl(quote.video.videoUrl)
    : null;

  return (
    <main className="min-h-dvh bg-[#050505] px-4 py-6 text-white md:px-8 md:py-12">
      <div className="mx-auto flex w-full justify-center">
        <CustomerQuoteCard
          storeName={storeName}
          storeProfileImageUrl={quote.account.StoreProfile?.profileImageUrl}
          imageUrl={imageUrl}
          previewMediaType={previewMediaType}
          modelUrl={modelUrl}
          videoUrl={videoUrl}
          imageAlt={`${title} quoted design`}
          estimatedDelivery={quote.estimatedDelivery}
          quotedMaterial={quoteMaterialLabel(quote.quoteMaterial, quote.quoteMaterialKarat)}
          quotedStone={quoteStoneLabel(quote.quoteStoneType)}
          metalColors={metalColors(quote)}
          estimatedCost={money(quote.quotedPriceCents) ?? "Contact store"}
          quoteNotes={quote.quoteNotes}
        />
      </div>
      <p className="mx-auto mt-5 max-w-[560px] text-center text-xs leading-5 text-[#8d8980]">
        This is a read-only quote from {storeName}. Contact the store directly to approve changes or place an order.
      </p>
    </main>
  );
}
