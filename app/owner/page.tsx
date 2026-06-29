import Link from "next/link";
import { prisma } from "@/server/db/client";
import { requireOwnerContext } from "@/src/lib/auth/owner-context";
import { getOwnerDashboardMetrics } from "@/src/lib/owner/dashboard-metrics";
import OwnerFrame from "./OwnerFrame";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  filter?: string;
};

type QuoteRow = Awaited<ReturnType<typeof getOwnerData>>["quotes"][number];

function formatDate(value: Date | null) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(cents / 100);
}

function isToday(value: Date | null) {
  if (!value) return false;
  const now = new Date();
  return value.getFullYear() === now.getFullYear()
    && value.getMonth() === now.getMonth()
    && value.getDate() === now.getDate();
}

function cleanLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase()) : null;
}

function statusClass(status: string) {
  if (status === "sent" || status === "fulfilled") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
  if (status === "priced") return "border-blue-300/30 bg-blue-400/10 text-blue-200";
  return "border-[#f7bc5f]/40 bg-[#1D120C]/90 text-[#f7bc5f]";
}

function quoteTitle(quote: QuoteRow) {
  return quote.text
    || quote.request?.text
    || (quote.productType === "picture" ? "Picture pendant" : null)
    || (quote.productType === "bracelet" ? "Bracelet" : null)
    || (quote.productType === "grillz" ? "Grillz" : null)
    || "Custom jewelry";
}

function productLabel(quote: QuoteRow) {
  const productType = quote.productType ?? quote.request?.productType;
  if (productType === "picture") return "Picture pendant";
  if (productType === "bracelet") return "Bracelet";
  if (productType === "grillz") return (quote.pendantFinish ?? quote.request?.pendantFinish) === "custom_grillz" ? "Custom Grillz" : "Grillz";
  if (productType === "general_quote") return "Custom jewelry";
  if ((quote.pendantFinish ?? quote.request?.pendantFinish) === "plain") return "Nameplate";
  return "Name pendant";
}

function referenceImage(quote: QuoteRow) {
  if (quote.designedImageUrl) return quote.designedImageUrl;
  if (!quote.referenceImageUrlsJson) return null;
  try {
    const urls = JSON.parse(quote.referenceImageUrlsJson);
    return Array.isArray(urls) && typeof urls[0] === "string" ? urls[0] : null;
  } catch {
    return null;
  }
}

function quoteMatches(quote: QuoteRow, query: string, filter: string) {
  const haystack = [
    quote.id,
    quote.status,
    quote.customerName,
    quote.customerEmail,
    quote.customerPhone,
    quote.text,
    quote.request?.text,
    quote.styleId,
    quote.request?.styleId,
    quote.productType,
    quote.request?.productType,
    quote.previewMediaType
  ].join(" ").toLowerCase();

  if (query && !haystack.includes(query)) return false;
  if (["pending", "priced", "sent", "fulfilled"].includes(filter) && quote.status !== filter) return false;
  if (filter === "today" && !isToday(quote.createdAt)) return false;
  if (filter === "3d" && !(
    quote.previewMediaType === "model3d"
    && quote.model3d?.status === "succeeded"
    && ["sent", "fulfilled", "closed"].includes(quote.status)
  )) return false;
  return true;
}

async function getOwnerData(accountId: string) {
  const [metrics, quotes] = await Promise.all([
    getOwnerDashboardMetrics(accountId),
    prisma.quoteRequest.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      take: 120,
      include: {
        result: { select: { id: true, imageUrl: true, variant: true, status: true } },
        resultRevision: { select: { id: true, imageUrl: true, revisionNumber: true, status: true } },
        video: { select: { id: true, status: true, videoUrl: true } },
        model3d: { select: { id: true, status: true, modelUrl: true } },
        request: {
          select: {
            id: true,
            productType: true,
            pendantFinish: true,
            styleId: true,
            text: true,
            primaryMetal: true,
            secondaryMetal: true,
            Results: {
              where: { status: "succeeded", imageUrl: { not: null } },
              select: { id: true, imageUrl: true },
              orderBy: { variant: "asc" }
            },
            ResultRevisions: {
              where: { status: "succeeded", imageUrl: { not: null } },
              select: { id: true, imageUrl: true }
            }
          }
        }
      }
    })
  ]);

  return { metrics, quotes };
}

function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex-shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
        active
          ? "border-[#dec47e]/30 bg-[#56450a] text-[#dec47e] shadow-[0_0_10px_rgba(201,148,59,0.15)]"
          : "border-white/5 bg-[#272a31] text-[#c2c6d6] hover:bg-[#363941]"
      }`}
    >
      {children}
    </Link>
  );
}

function MetricCard({ label, value, suffix, accent = false }: { label: string; value: React.ReactNode; suffix?: string; accent?: boolean }) {
  return (
    <div className={`relative min-w-0 overflow-hidden rounded-xl border p-4 ${accent ? "border-[#D1B873]/20 bg-[#17191F]" : "border-white/5 bg-[#17191F]"}`}>
      {accent ? <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-[#f7bc5f]/10 blur-xl" aria-hidden /> : null}
      <span className={`text-[12px] font-semibold uppercase tracking-wider ${accent ? "text-[#f7bc5f]" : "text-[#8c909f]"}`}>{label}</span>
      <div className={`mt-1 flex min-w-0 items-baseline gap-1.5 ${accent ? "text-[#f7bc5f]" : "text-[#e1e2ec]"}`}>
        <span className="min-w-0 break-words text-[28px] font-bold leading-tight">{value}</span>
        {suffix ? <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8c909f]">{suffix}</span> : null}
      </div>
    </div>
  );
}

function QuoteCard({ quote, openPreview = false }: { quote: QuoteRow; openPreview?: boolean }) {
  const imageUrl = referenceImage(quote);
  const generationCount = (quote.request?.Results.length ?? 0) + (quote.request?.ResultRevisions.length ?? 0);

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#D1B873]/30 bg-[#17191F] shadow-[0_8px_30px_rgba(0,0,0,0.4)] md:flex-row">
      <div className="relative h-64 w-full bg-black md:h-auto md:w-2/5">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={`${quoteTitle(quote)} selected design`} className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:opacity-100" />
        ) : (
          <div className="flex h-full min-h-64 items-center justify-center px-6 text-center text-sm text-white/35">No design image selected</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:bg-gradient-to-r" />
        <div className={`absolute left-4 top-4 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium backdrop-blur ${statusClass(quote.status)}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {cleanLabel(quote.status)}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <h2 className="break-words text-[22px] font-bold leading-tight text-[#e1e2ec]">{quoteTitle(quote)}</h2>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f7bc5f]">{productLabel(quote)}</p>
            </div>
            <span className="flex-shrink-0 text-[11px] leading-5 text-[#8c909f]">{formatDate(quote.createdAt)}</span>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-4 border-t border-white/5 pt-4 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-[#8c909f]">Customer</dt>
              <dd className="mt-1 break-words text-[15px] font-medium text-[#e1e2ec]">{quote.customerName}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-[#8c909f]">Contact</dt>
              <dd className="mt-1 break-words text-[15px] font-medium text-[#e1e2ec]">{quote.customerPhone || quote.customerEmail}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-[#8c909f]">Design choices</dt>
              <dd className="mt-1 text-[15px] font-medium text-[#e1e2ec]">{generationCount > 0 ? `${generationCount} available` : "Uploaded reference"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-[#8c909f]">Preview</dt>
              <dd className="mt-1 text-[15px] font-medium text-[#e1e2ec]">{quote.previewMediaType === "model3d" ? "Image + 3D" : quote.previewMediaType === "video" ? "Image + Video" : "Image only"}</dd>
            </div>
          </dl>
        </div>

        <Link
          href={`/owner/quotes/${quote.id}/${openPreview ? "preview" : "prepare"}`}
          className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-[#3B82F6] px-5 text-sm font-semibold text-white shadow-[0_0_25px_rgba(59,130,246,0.25)] transition hover:bg-blue-400"
        >
          {openPreview ? "View Quote Preview" : "Prepare Quote"}
        </Link>
      </div>
    </article>
  );
}

export default async function OwnerDashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { accountId } = await requireOwnerContext();
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const filter = (params.filter ?? "all").toLowerCase();
  const data = await getOwnerData(accountId);
  const visibleQuotes = data.quotes.filter(quote => quoteMatches(quote, query, filter));
  const currentQuery = params.q ? `&q=${encodeURIComponent(params.q)}` : "";
  const chipHref = (nextFilter: string) => `/owner?filter=${nextFilter}${currentQuery}`;

  return (
    <OwnerFrame active="Quotes">
      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-8 px-4 md:px-6">
        <section className="min-w-0">
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Quotes</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Choose a customer design, prepare the quote, and add an optional preview asset.</p>
        </section>

        <section className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Sent Quotes" value={data.metrics.sentQuotes} />
          <MetricCard label="Pending Quotes" value={data.metrics.pendingQuotes} accent />
          <MetricCard label="Designs on Plan" value={`${data.metrics.designUsage.used} / ${data.metrics.designUsage.included}`} suffix="used" />
          <MetricCard label="Potential Revenue" value={formatUsd(data.metrics.potentialRevenueCents)} />
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <form className="relative flex h-12 w-full min-w-0 items-center rounded-xl border border-white/10 bg-black/45 px-4 shadow-inner transition focus-within:border-white/30">
            <span className="mr-3 flex-shrink-0 text-[#8c909f]" aria-hidden>search</span>
            <input name="q" defaultValue={params.q ?? ""} className="min-w-0 flex-1 border-none bg-transparent text-base text-[#e1e2ec] outline-none placeholder:text-white/30" placeholder="Search customer, design, or style" />
            <input type="hidden" name="filter" value={filter} />
          </form>
          <div className="-mx-4 flex max-w-[100vw] gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterChip href={chipHref("all")} active={filter === "all"}>All</FilterChip>
            <FilterChip href={chipHref("sent")} active={filter === "sent"}>Sent</FilterChip>
            <FilterChip href={chipHref("today")} active={filter === "today"}>Today</FilterChip>
            <FilterChip href={chipHref("3d")} active={filter === "3d"}>3D Models</FilterChip>
          </div>
        </section>

        <section className="grid min-w-0 gap-5">
          {visibleQuotes.map(quote => <QuoteCard key={quote.id} quote={quote} openPreview={filter === "3d"} />)}
          {visibleQuotes.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-[#17191F] p-8 text-center text-sm text-[#8c909f]">No quotes match the current filters.</div>
          ) : null}
        </section>
      </div>
    </OwnerFrame>
  );
}
