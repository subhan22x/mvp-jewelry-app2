import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import { isOwnerSessionValue, OWNER_SESSION_COOKIE } from "@/src/lib/owner-auth";
import OwnerLoginForm from "./OwnerLoginForm";
import SendQuoteForm from "./SendQuoteForm";
import GenerateVideoButton from "./GenerateVideoButton";
import OwnerFrame from "./OwnerFrame";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  filter?: string;
};

type GenerationRow = Awaited<ReturnType<typeof getOwnerData>>["generations"][number];

function formatDate(value: Date | null) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function isToday(value: Date | null) {
  if (!value) return false;
  const now = new Date();
  return value.getFullYear() === now.getFullYear()
    && value.getMonth() === now.getMonth()
    && value.getDate() === now.getDate();
}

function metalLabel(primary?: string | null, secondary?: string | null) {
  const pretty = (value?: string | null) =>
    value ? value.replace(/_/g, " ").replace(/\b\w/g, char => char.toUpperCase()) : "Not selected";
  return secondary && secondary !== primary ? `${pretty(primary)} + ${pretty(secondary)}` : pretty(primary);
}

function sizeLabel(size?: string | null) {
  const labels: Record<string, string> = {
    "2_3_inches": "2 - 3 inches",
    "3_4_5_inches": "3 - 4.5 inches",
    "4_5_7_inches": "4.5 - 7 inches",
    "7_10_inches": "7 - 10 inches"
  };
  return size ? labels[size] ?? size : "n/a";
}

function materialSpecLabel(value?: string | null) {
  const labels: Record<string, string> = {
    gold: "Gold",
    silver: "Silver",
    rose_gold: "Rose Gold",
    gold_plated: "Gold Plated",
    "10k": "10K",
    "14k": "14K",
    "18k": "18K",
    natural_diamonds: "Natural Diamonds",
    lab_diamonds: "Lab Diamonds",
    moissanite: "Moissanite",
    rope: "Rope chain",
    box: "Box chain",
    snake: "Snake chain",
    cable: "Cable chain",
    station: "Station chain",
    bar_link_tube_station: "Bar link chain / tube station chain",
    figaro_oval_link: "Figaro style / oval link chain"
  };
  return value ? labels[value] ?? value : "n/a";
}

function quoteMaterialFromSelection(value?: string | null) {
  if (value === "gold" || value === "silver") return value;
  return null;
}

function quoteStoneFromSelection(value?: string | null) {
  const supported = new Set(["natural_diamonds", "lab_diamonds", "moissanite", "cz", "other"]);
  return value && supported.has(value) ? value : null;
}

function statusClass(status: string) {
  if (status === "sent") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
  if (status === "failed") return "border-red-300/30 bg-red-400/10 text-red-200";
  if (status === "succeeded") return "border-blue-300/30 bg-blue-400/10 text-blue-200";
  return "border-[#f7bc5f]/40 bg-[#1D120C]/90 text-[#f7bc5f]";
}

function generationMatches(row: GenerationRow, query: string, filter: string) {
  const quote = row.QuoteRequests[0] ?? null;
  const request = row.request;
  const haystack = [
    row.id,
    row.status,
    request.text,
    request.styleId,
    request.pendantFinish,
    request.primaryMetal,
    request.secondaryMetal,
    request.size,
    request.metalType,
    request.stoneType,
    request.plainColor,
    request.plainMetal,
    request.plainKarat,
    request.plainChain,
    request.productType,
    request.uploadFileName,
    quote?.customerName,
    quote?.customerEmail,
    quote?.status
  ].join(" ").toLowerCase();

  if (query && !haystack.includes(query)) return false;
  if (filter === "pending" && quote?.status !== "pending") return false;
  if (filter === "sent" && quote?.status !== "sent") return false;
  if (filter === "today" && !isToday(row.createdAt)) return false;
  if (filter === "name" && request.productType !== "name") return false;
  if (filter === "picture" && request.productType !== "picture") return false;
  return true;
}

async function getOwnerData() {
  const accountId = getDefaultAccountId();
  const [quoteCount, totalGenerations, pendingQuotes, sentQuotes, generations] = await Promise.all([
    prisma.quoteRequest.count({ where: { accountId } }),
    prisma.result.count({ where: { accountId } }),
    prisma.quoteRequest.count({ where: { accountId, status: "pending" } }),
    prisma.quoteRequest.count({ where: { accountId, status: "sent" } }),
    prisma.result.findMany({
      where: { accountId },
      orderBy: [{ createdAt: "desc" }],
      take: 120,
      include: {
        QuoteRequests: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        request: {
          select: {
            id: true,
            productType: true,
            pendantFinish: true,
            styleId: true,
            text: true,
            primaryMetal: true,
            secondaryMetal: true,
            size: true,
            metalType: true,
            stoneType: true,
            plainColor: true,
            plainMetal: true,
            plainKarat: true,
            plainChain: true,
            uploadFileName: true,
            Videos: {
              select: {
                id: true,
                sourceResultId: true,
                status: true
              },
              orderBy: { createdAt: "desc" }
            }
          }
        }
      }
    })
  ]);

  return {
    metrics: { quoteCount, totalGenerations, pendingQuotes, sentQuotes },
    generations
  };
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

function MetricCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`relative min-w-0 overflow-hidden rounded-xl border p-4 ${accent ? "border-[#D1B873]/20 bg-[#17191F]" : "border-white/5 bg-[#17191F]"}`}>
      {accent && <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-[#f7bc5f]/10 blur-xl" aria-hidden />}
      <span className={`text-[12px] font-semibold uppercase tracking-wider ${accent ? "text-[#f7bc5f]" : "text-[#8c909f]"}`}>{label}</span>
      <div className={`mt-1 text-[28px] font-bold ${accent ? "text-[#f7bc5f]" : "text-[#e1e2ec]"}`}>{value}</div>
    </div>
  );
}

function generationTypeLabel(row: GenerationRow) {
  if (row.request.productType === "picture") return "Picture pendant";
  return row.request.pendantFinish === "plain" ? "Nameplate" : "Icedout name pendant";
}

function generationTitle(row: GenerationRow) {
  if (row.request.productType === "picture") return row.request.uploadFileName || row.request.text || "Picture pendant";
  return row.request.text || "Name pendant";
}

function quoteReviewDetails(row: GenerationRow, quote: NonNullable<GenerationRow["QuoteRequests"][number]>) {
  const productType = quote.productType ?? row.request.productType;
  const pendantFinish = quote.pendantFinish ?? row.request.pendantFinish;
  const isPlain = pendantFinish === "plain";

  const customerDetails = [
    { label: "Customer", value: quote.customerName },
    { label: "Phone", value: quote.customerPhone },
    { label: "Email", value: quote.customerEmail },
  ];

  const designDetails = [
    { label: "Text / engraving", value: quote.text ?? row.request.text },
    { label: "Finish", value: isPlain ? "Plain" : "Icedout" },
    { label: "Metal colors", value: metalLabel(quote.primaryMetal ?? row.request.primaryMetal, quote.secondaryMetal ?? row.request.secondaryMetal) },
    { label: "Size", value: sizeLabel(quote.size ?? row.request.size) },
    { label: "Metal type", value: materialSpecLabel(quote.metalType ?? row.request.metalType) },
    { label: "Stone type", value: materialSpecLabel(quote.stoneType ?? row.request.stoneType) },
    { label: "Style", value: quote.styleId ?? row.request.styleId },
    { label: "Product", value: productType === "picture" ? "Picture pendant" : isPlain ? "Nameplate" : "Icedout name pendant" },
    { label: "Plain color", value: materialSpecLabel(quote.plainColor ?? row.request.plainColor) },
    { label: "Plain metal", value: materialSpecLabel(quote.plainMetal ?? row.request.plainMetal) },
    { label: "Karat", value: materialSpecLabel(quote.plainKarat ?? row.request.plainKarat) },
    { label: "Chain", value: materialSpecLabel(quote.plainChain ?? row.request.plainChain) },
    { label: "Emblem", value: quote.emblem },
    { label: "Diamond quality", value: quote.diamondQuality },
  ].filter(detail => detail.value && detail.value !== "n/a" && detail.value !== "Not selected");

  return { customerDetails, designDetails };
}

function GenerationCard({ row }: { row: GenerationRow }) {
  const quote = row.QuoteRequests[0] ?? null;
  const videosForImage = row.request.Videos.filter(video => video.sourceResultId === row.id);
  const completedVideos = videosForImage.filter(video => video.status === "succeeded").length;
  const canGenerateVideo = row.request.productType === "name";
  const reviewDetails = quote ? quoteReviewDetails(row, quote) : null;

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#D1B873]/30 bg-[#17191F] shadow-[0_8px_30px_rgba(0,0,0,0.4)] md:flex-row">
      <div className="relative h-64 w-full bg-black md:h-auto md:w-2/5">
        {row.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.imageUrl} alt={`${generationTitle(row)} generated pendant`} className="h-full w-full object-cover opacity-85 transition duration-500 group-hover:opacity-100" />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/35">No generated image saved</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:bg-gradient-to-r" />
        <div className={`absolute left-4 top-4 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium backdrop-blur ${statusClass(row.status)}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {row.status}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between bg-[#17191F] p-5 md:bg-transparent">
        <div>
          <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <h3 className="min-w-0 break-words text-[22px] font-bold leading-tight text-[#e1e2ec]">{generationTitle(row)}</h3>
              <p className="mt-2 break-words text-[11px] font-semibold uppercase leading-5 tracking-[0.18em] text-[#f7bc5f]">{generationTypeLabel(row)} / Draft {row.variant}</p>
            </div>
            <span className="flex-shrink-0 text-[11px] leading-5 text-[#8c909f] sm:pt-1">{formatDate(row.createdAt)}</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 border-t border-white/5 pb-2 pt-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Text</span>
              <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{row.request.text || "n/a"}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Style</span>
              <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{row.request.styleId ?? "n/a"}</span>
            </div>
            {quote && (
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Customer</span>
                <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{quote.customerName}</span>
              </div>
            )}
            {row.request.pendantFinish === "plain" ? (
              <>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Finish</span>
                  <span className="break-words text-[15px] font-medium text-[#e1e2ec]">Plain</span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Color</span>
                  <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(row.request.plainColor)}</span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Metal</span>
                  <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(row.request.plainMetal)}</span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Karat</span>
                  <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(row.request.plainKarat)}</span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Chain</span>
                  <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(row.request.plainChain)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Metal Colors</span>
                  <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{metalLabel(row.request.primaryMetal, row.request.secondaryMetal)}</span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Size</span>
                  <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{sizeLabel(row.request.size)}</span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Metal Type</span>
                  <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(row.request.metalType)}</span>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Stone Type</span>
                  <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(row.request.stoneType)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 grid items-start gap-3 sm:grid-cols-2">
          {quote ? (
            <SendQuoteForm
              quoteId={quote.id}
              status={quote.status}
              quotedPriceCents={quote.quotedPriceCents}
              quoteNotes={quote.quoteNotes}
              estimatedDelivery={quote.estimatedDelivery}
              quoteMaterial={quote.quoteMaterial ?? quoteMaterialFromSelection(quote.metalType ?? row.request.metalType ?? quote.plainMetal ?? row.request.plainMetal)}
              quoteMaterialKarat={quote.quoteMaterialKarat ?? quote.plainKarat ?? row.request.plainKarat}
              quoteStoneType={quote.quoteStoneType ?? quoteStoneFromSelection(quote.stoneType ?? row.request.stoneType)}
              imageUrl={row.imageUrl}
              customerDetails={reviewDetails?.customerDetails ?? []}
              designDetails={reviewDetails?.designDetails ?? []}
            />
          ) : (
            <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-center text-xs text-[#8c909f]">
              No customer quote request for this draft yet.
            </div>
          )}
          {canGenerateVideo ? (
            <GenerateVideoButton
              resultId={row.id}
              attemptCount={videosForImage.length}
              completedCount={completedVideos}
              disabled={!row.imageUrl || row.status !== "succeeded"}
              labelOverride="Quick video generate"
            />
          ) : (
            <div className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3 text-center text-xs text-[#8c909f]">
              Video generation is available for name pendants only.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function OwnerDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const cookieValue = cookies().get(OWNER_SESSION_COOKIE)?.value;
  if (!isOwnerSessionValue(cookieValue)) {
    return <OwnerLoginForm />;
  }

  const query = (searchParams.q ?? "").trim().toLowerCase();
  const filter = (searchParams.filter ?? "all").toLowerCase();
  const data = await getOwnerData();
  const visibleGenerations = data.generations.filter(row => generationMatches(row, query, filter));

  const currentQuery = searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : "";
  const chipHref = (nextFilter: string) => `/owner?filter=${nextFilter}${currentQuery}`;

  return (
    <OwnerFrame active="Quotes">
      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-8 px-4 md:px-6">
        <section className="min-w-0">
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Store Dashboard</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Review generations, send quotes, and create quick videos</p>
        </section>

        <section className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Quote Requests" value={data.metrics.quoteCount} />
          <MetricCard label="Total Generations" value={data.metrics.totalGenerations} />
          <MetricCard label="Pending Quotes" value={data.metrics.pendingQuotes} accent />
          <MetricCard label="Sent Quotes" value={data.metrics.sentQuotes} />
        </section>

        <section className="flex min-w-0 flex-col gap-4">
          <form className="relative flex h-12 w-full min-w-0 items-center rounded-xl border border-white/10 bg-black/45 px-4 shadow-inner transition focus-within:border-white/30">
            <span className="mr-3 flex-shrink-0 text-[#8c909f]" aria-hidden>search</span>
            <input
              name="q"
              defaultValue={searchParams.q ?? ""}
              className="min-w-0 flex-1 border-none bg-transparent text-base text-[#e1e2ec] outline-none placeholder:text-white/30 focus:ring-0"
              placeholder="Search customer, text, or style"
            />
            <input type="hidden" name="filter" value={filter} />
          </form>
          <div className="-mx-4 flex max-w-[100vw] gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterChip href={chipHref("all")} active={filter === "all"}>All</FilterChip>
            <FilterChip href={chipHref("pending")} active={filter === "pending"}>Pending</FilterChip>
            <FilterChip href={chipHref("sent")} active={filter === "sent"}>Sent</FilterChip>
            <FilterChip href={chipHref("today")} active={filter === "today"}>Today</FilterChip>
            <FilterChip href={chipHref("name")} active={filter === "name"}>Name Pendants</FilterChip>
            <FilterChip href={chipHref("picture")} active={filter === "picture"}>Picture Pendants</FilterChip>
          </div>
        </section>

        <section className="grid min-w-0 gap-6">
          <details open className="group min-w-0">
            <summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#272a31] p-4 transition hover:bg-[#363941]">
              <div className="min-w-0">
                <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8c909f]">Generations</h2>
                <p className="mt-1 text-sm text-[#c2c6d6]">Newest generated drafts first</p>
              </div>
              <span className="flex-shrink-0 text-[#f7bc5f] transition group-open:rotate-180" aria-hidden>v</span>
            </summary>
            <div className="mt-4 flex min-w-0 flex-col gap-5">
              {visibleGenerations.map(row => <GenerationCard key={row.id} row={row} />)}
              {visibleGenerations.length === 0 && (
                <div className="rounded-xl border border-white/5 bg-[#17191F] p-6 text-center text-sm text-[#8c909f] sm:p-8">
                  No generations match the current filters.
                </div>
              )}
            </div>
          </details>
        </section>
      </div>
    </OwnerFrame>
  );
}
