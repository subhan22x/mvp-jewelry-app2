import QuoteMediaViewer, { type QuotePreviewMediaType } from "./QuoteMediaViewer";

type CustomerQuoteCardProps = {
  storeName: string;
  storeProfileImageUrl?: string | null;
  imageUrl: string | null;
  previewMediaType?: QuotePreviewMediaType | null;
  modelUrl?: string | null;
  videoUrl?: string | null;
  imageAlt: string;
  estimatedDelivery?: string | null;
  quotedMaterial?: string | null;
  quotedStone?: string | null;
  metalColors?: string | null;
  estimatedCost: string;
  quoteNotes?: string | null;
};

function displayValue(value: string | null | undefined) {
  return value?.trim() || "To be confirmed";
}

export default function CustomerQuoteCard({
  storeName,
  storeProfileImageUrl = null,
  imageUrl,
  previewMediaType = "image",
  modelUrl = null,
  videoUrl = null,
  imageAlt,
  estimatedDelivery,
  quotedMaterial,
  quotedStone,
  metalColors,
  estimatedCost,
  quoteNotes = null
}: CustomerQuoteCardProps) {
  const details = [
    { label: "Estimated Delivery", value: displayValue(estimatedDelivery) },
    { label: "Quoted Material", value: displayValue(quotedMaterial) },
    { label: "Quoted Stone", value: displayValue(quotedStone) },
    { label: "Metal Colors", value: displayValue(metalColors) }
  ];

  return (
    <article
      aria-label={`Quote from ${storeName}`}
      className="w-full max-w-[430px] overflow-hidden rounded-[1.65rem] bg-[#1f1f1d] font-[family-name:var(--font-instrument-sans)] text-white shadow-[0_32px_90px_rgba(0,0,0,0.5)] md:max-w-[560px] md:rounded-[2rem]"
    >
      <header className="flex min-h-20 items-center justify-center gap-3 bg-[#20201e] px-5 py-3 md:min-h-24 md:gap-4">
        {storeProfileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={storeProfileImageUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full border border-white/10 object-cover md:h-14 md:w-14"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d4b86a]/40 bg-[#d4b86a] text-lg font-bold text-[#171612] md:h-14 md:w-14 md:text-xl"
          >
            {storeName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <p className="max-w-[13rem] text-xl font-bold uppercase leading-[0.92] tracking-[-0.04em] text-white md:max-w-[17rem] md:text-2xl">
          {storeName}
        </p>
      </header>

      <QuoteMediaViewer
        imageUrl={imageUrl}
        previewMediaType={previewMediaType}
        modelUrl={modelUrl}
        videoUrl={videoUrl}
        alt={imageAlt}
        customerCard
      />

      <div className="space-y-4 bg-[#1b1b19] p-5 md:space-y-5 md:p-7">
        <dl className="space-y-2.5 md:space-y-3">
          {details.map(detail => (
            <div
              key={detail.label}
              className="grid min-h-[4.75rem] grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center gap-4 rounded-xl bg-[#343432] px-4 py-3 md:min-h-[5.25rem] md:px-5"
            >
              <dt className="font-[family-name:var(--font-archivo-narrow)] text-[1.05rem] font-bold uppercase leading-none tracking-[-0.02em] text-white md:text-xl">
                {detail.label}
              </dt>
              <dd className="break-words text-right text-base font-bold leading-tight text-[#d7bd75] md:text-xl">
                {detail.value}
              </dd>
            </div>
          ))}
        </dl>

        {quoteNotes ? (
          <div className="rounded-xl bg-[#343432] px-4 py-4 md:px-5">
            <p className="font-[family-name:var(--font-archivo-narrow)] text-sm font-bold uppercase tracking-[0.08em] text-white">
              A note from {storeName}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#d8d5ce] md:text-base">{quoteNotes}</p>
          </div>
        ) : null}

        <div className="rounded-[1.35rem] border-2 border-[#d7bd75] px-5 py-6 text-center md:px-7 md:py-8">
          <p className="font-[family-name:var(--font-archivo-narrow)] text-lg font-bold uppercase leading-none text-[#d7bd75] md:text-2xl">
            Estimated cost
          </p>
          <p className="mt-4 break-words font-[family-name:var(--font-boldonse)] text-[2.75rem] leading-none tracking-[-0.07em] text-[#d7bd75] md:mt-5 md:text-[4.25rem]">
            {estimatedCost}
          </p>
        </div>
      </div>
    </article>
  );
}
