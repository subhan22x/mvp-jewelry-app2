import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/client";
import { proxiedPublicQuoteModelUrl } from "@/src/lib/model3d/proxy";
import QuoteMediaViewer, { type QuotePreviewMediaType } from "./QuoteMediaViewer";

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
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function cleanLabel(value: string | null | undefined) {
  if (!value) return null;
  return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());
}

function materialLabel(material: string | null, karat: string | null) {
  const materialText = cleanLabel(material);
  if (!materialText) return null;
  return material === "gold" && karat ? `${karat.toUpperCase()} ${materialText}` : materialText;
}

function designTitle(quote: { text: string | null; productType: string | null; styleId: string | null }) {
  if (quote.text) return quote.text;
  if (quote.productType === "picture") return "Picture pendant";
  if (quote.productType === "grillz") return "Grillz";
  if (quote.productType === "general_quote") return "Custom jewelry quote";
  return cleanLabel(quote.styleId) ?? "Custom pendant";
}

function productLabel(productType: string | null, pendantFinish: string | null) {
  if (productType === "picture") return "Picture pendant";
  if (productType === "bracelet") return "Bracelet";
  if (productType === "grillz") return pendantFinish === "custom_grillz" ? "Custom Grillz" : "Grillz";
  if (productType === "general_quote") return "Custom jewelry";
  return "Name pendant";
}

function detailRows(quote: {
  estimatedDelivery: string | null;
  quoteMaterial: string | null;
  quoteMaterialKarat: string | null;
  quoteStoneType: string | null;
  productType: string | null;
  pendantFinish: string | null;
  styleId: string | null;
  text: string | null;
  primaryMetal: string | null;
  secondaryMetal: string | null;
  size: string | null;
  metalType: string | null;
  stoneType: string | null;
  plainColor: string | null;
  plainMetal: string | null;
  plainKarat: string | null;
  plainChain: string | null;
  diamondQuality: string | null;
}) {
  return [
    { label: "Estimated delivery", value: quote.estimatedDelivery },
    { label: "Quoted material", value: materialLabel(quote.quoteMaterial, quote.quoteMaterialKarat) },
    { label: "Quoted stone", value: cleanLabel(quote.quoteStoneType) },
    { label: "Product", value: productLabel(quote.productType, quote.pendantFinish) },
    { label: "Text", value: quote.text },
    { label: "Finish", value: cleanLabel(quote.pendantFinish) },
    { label: "Style", value: cleanLabel(quote.styleId) },
    { label: "Metal colors", value: [cleanLabel(quote.primaryMetal), cleanLabel(quote.secondaryMetal)].filter(Boolean).join(" + ") || null },
    { label: "Size", value: cleanLabel(quote.size) },
    { label: "Metal type", value: cleanLabel(quote.metalType ?? quote.plainMetal) },
    { label: "Karat", value: cleanLabel(quote.plainKarat) },
    { label: "Chain", value: cleanLabel(quote.plainChain) },
    { label: "Stone type", value: cleanLabel(quote.stoneType) },
    { label: "Plain color", value: cleanLabel(quote.plainColor) },
    { label: "Diamond quality", value: quote.diamondQuality }
  ].filter(row => row.value && row.value !== "N/a" && row.value !== "Not Selected");
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
  const rows = detailRows(quote);

  return (
    <main className="min-h-dvh bg-[#151311] px-4 py-5 text-[#f5f0e8] md:px-6 md:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="min-w-0">
          <div className="mb-5 flex items-center gap-3">
            {quote.account.StoreProfile?.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={quote.account.StoreProfile.profileImageUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d3a84f] text-sm font-black text-black">
                {storeName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8d8377]">Quote from</p>
              <p className="truncate text-base font-black">{storeName}</p>
            </div>
          </div>

          <QuoteMediaViewer
            imageUrl={imageUrl}
            previewMediaType={previewMediaType}
            modelUrl={modelUrl}
            videoUrl={videoUrl}
            alt={`${title} quoted design`}
          />
        </section>

        <section className="min-w-0 rounded-[1.75rem] border border-[#332d26] bg-[#1c1915] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.3)] md:p-7">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-[#d3a84f]">Custom jewelry quote</p>
          <h1 className="mt-3 break-words text-4xl font-black leading-tight tracking-normal text-[#f5f0e8]">{title}</h1>

          <div className="mt-6 rounded-[1.25rem] border border-[#3e3527] bg-[#12110f] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d8377]">Quote total</p>
            <p className="mt-1 text-4xl font-black text-[#d3a84f]">{money(quote.quotedPriceCents) ?? "Contact store"}</p>
          </div>

          {quote.quoteNotes && (
            <div className="mt-4 rounded-[1.25rem] border border-[#3e3527] bg-[#12110f] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8d8377]">Message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#ddd4c7]">{quote.quoteNotes}</p>
            </div>
          )}

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {rows.map(row => (
              <div key={row.label} className="min-w-0 rounded-[1.1rem] border border-[#3e3527] bg-[#12110f] p-3">
                <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8d8377]">{row.label}</dt>
                <dd className="mt-1 break-words text-sm font-bold leading-5 text-[#f5f0e8]">{row.value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 text-xs leading-5 text-[#8d8377]">
            This quote is a read-only snapshot shared by {storeName}. Contact the store directly to approve changes or place an order.
          </p>
        </section>
      </div>
    </main>
  );
}
