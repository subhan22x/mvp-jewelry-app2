import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/server/db/client";
import { isOwnerSessionValue, OWNER_SESSION_COOKIE } from "@/src/lib/owner-auth";
import OwnerLoginForm from "./OwnerLoginForm";
import GenerateVideoButton from "./GenerateVideoButton";
import SendQuoteForm from "./SendQuoteForm";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  filter?: string;
};

type QuoteRow = Awaited<ReturnType<typeof getOwnerData>>["quoteRequests"][number];
type ResultRow = Awaited<ReturnType<typeof getOwnerData>>["results"][number];

function shortId(id: string) {
  return id.slice(0, 8);
}

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

function statusClass(status: string) {
  if (status === "sent") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
  if (status === "failed") return "border-red-300/30 bg-red-400/10 text-red-200";
  if (status === "succeeded") return "border-blue-300/30 bg-blue-400/10 text-blue-200";
  return "border-[#f7bc5f]/40 bg-[#1D120C]/90 text-[#f7bc5f]";
}

function quoteMatches(quote: QuoteRow, query: string, filter: string) {
  const haystack = [
    quote.id,
    quote.customerName,
    quote.customerEmail,
    quote.text,
    quote.styleId,
    quote.primaryMetal,
    quote.secondaryMetal,
    quote.productType
  ].join(" ").toLowerCase();
  if (query && !haystack.includes(query)) return false;
  if (filter === "pending" && quote.status !== "pending") return false;
  if (filter === "sent" && quote.status !== "sent") return false;
  if (filter === "today" && !isToday(quote.createdAt)) return false;
  if (filter === "name" && quote.productType !== "name") return false;
  if (filter === "picture" && quote.productType !== "picture") return false;
  return true;
}

function resultMatches(row: ResultRow, query: string, filter: string) {
  const haystack = [
    row.id,
    row.requestId,
    row.request.text,
    row.request.styleId,
    row.request.productType,
    row.request.primaryMetal,
    row.request.secondaryMetal,
    row.status
  ].join(" ").toLowerCase();
  if (query && !haystack.includes(query)) return false;
  if (filter === "today" && !isToday(row.createdAt)) return false;
  if (filter === "name" && row.request.productType !== "name") return false;
  if (filter === "picture" && row.request.productType !== "picture") return false;
  if (filter === "pending" && row.status !== "pending") return false;
  if (filter === "sent") return false;
  if (row.request.productType !== "name") return false;
  return true;
}

async function getOwnerData() {
  const [quoteCount, totalGenerations, pendingQuotes, sentQuotes, quoteRequests, results] = await Promise.all([
    prisma.quoteRequest.count(),
    prisma.result.count(),
    prisma.quoteRequest.count({ where: { status: "pending" } }),
    prisma.quoteRequest.count({ where: { status: "sent" } }),
    prisma.quoteRequest.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 80
    }),
    prisma.result.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 160,
      include: {
        request: {
          select: {
            id: true,
            text: true,
            productType: true,
            uploadFileName: true,
            styleId: true,
            primaryMetal: true,
            secondaryMetal: true,
            emblem: true,
            createdAt: true,
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
    quoteRequests,
    results
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

function QuoteCard({ quote }: { quote: QuoteRow }) {
  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#D1B873]/30 bg-[#17191F] shadow-[0_8px_30px_rgba(0,0,0,0.4)] md:flex-row">
      <div className="relative h-64 w-full bg-black md:h-auto md:w-2/5">
        {quote.designedImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={quote.designedImageUrl} alt={`${quote.customerName} generated pendant`} className="h-full w-full object-cover opacity-85 transition duration-500 group-hover:opacity-100" />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/35">No designed image saved</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent md:bg-gradient-to-r" />
        <div className={`absolute left-4 top-4 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium backdrop-blur ${statusClass(quote.status)}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
          {quote.status}
        </div>
      </div>

      <div className="-mt-8 flex min-w-0 flex-1 flex-col justify-between bg-gradient-to-t from-[#17191F] via-[#17191F] to-transparent p-5 md:mt-0 md:bg-none">
        <div>
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <h3 className="min-w-0 break-words text-[22px] font-bold text-[#e1e2ec]">{quote.customerName}</h3>
            <span className="flex-shrink-0 text-[11px] text-[#8c909f]">{formatDate(quote.createdAt)}</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 border-t border-white/5 pb-2 pt-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Text</span>
              <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{quote.text || "n/a"}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Style</span>
              <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{quote.styleId ?? "n/a"}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Metal Colors</span>
              <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{metalLabel(quote.primaryMetal, quote.secondaryMetal)}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Diamond Tier</span>
              <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{quote.diamondQuality?.toUpperCase() ?? "n/a"}</span>
            </div>
          </div>
        </div>

        <SendQuoteForm
          quoteId={quote.id}
          status={quote.status}
          quotedPriceCents={quote.quotedPriceCents}
          quoteNotes={quote.quoteNotes}
        />
      </div>
    </article>
  );
}

function GenerationCard({ row }: { row: ResultRow }) {
  const videoJobsForImage = row.request.Videos.filter(video => video.sourceResultId === row.id);
  const completedCount = videoJobsForImage.filter(video => video.status === "succeeded").length;

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/5 bg-[#17191F] p-3 transition hover:bg-white/[0.02]">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black">
        {row.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={row.imageUrl} alt={`${row.request.text} generation`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-white/30">No image</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h4 className="truncate text-[15px] font-semibold text-[#e1e2ec]">{row.request.productType === "picture" ? row.request.uploadFileName ?? row.request.text : row.request.text}</h4>
          <span className={`flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${statusClass(row.status)}`}>{row.status}</span>
        </div>
        <p className="mt-1 truncate text-[12px] text-[#8c909f]">
          Style: {row.request.styleId} / Draft {row.variant} / {formatDate(row.createdAt)}
        </p>
      </div>
      {row.imageUrl ? (
        <a
          href={row.imageUrl}
          target="_blank"
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/5 bg-[#1d2027] text-[#e1e2ec] transition hover:bg-white/10"
          aria-label="View generation"
        >
          &gt;
        </a>
      ) : (
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-white/5 bg-[#1d2027] text-[#8c909f]">-</span>
      )}
      </div>
      <GenerateVideoButton
        resultId={row.id}
        attemptCount={videoJobsForImage.length}
        completedCount={completedCount}
        disabled={!row.imageUrl || row.status !== "succeeded"}
      />
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-center justify-around rounded-t-xl border-t border-white/10 bg-black/90 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl lg:hidden">
      {["Dashboard", "Quotes", "Generations", "Settings"].map((item, index) => (
        <a key={item} href="#" className={`flex flex-col items-center justify-center text-xs ${index === 0 ? "scale-110 text-[#f7bc5f]" : "text-[#8c909f] hover:text-[#adc6ff]"}`}>
          <span className="text-lg" aria-hidden>{index === 0 ? "*" : "o"}</span>
          <span className="sr-only">{item}</span>
        </a>
      ))}
    </nav>
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
  const visibleQuotes = data.quoteRequests.filter(quote => quoteMatches(quote, query, filter));
  const visibleResults = data.results
    .filter(row => resultMatches(row, query, filter));

  const currentQuery = searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : "";
  const chipHref = (nextFilter: string) => `/owner?filter=${nextFilter}${currentQuery}`;

  return (
    <main className="min-h-dvh max-w-full overflow-x-hidden bg-[#101114] pb-28 pt-20 text-[#e1e2ec] antialiased selection:bg-[#f7bc5f] selection:text-[#101114] lg:pl-72">
      <header className="fixed left-0 top-0 z-40 flex h-16 w-full max-w-full items-center justify-between gap-3 overflow-hidden border-b border-white/10 bg-[#101114] px-4 shadow-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-[#f7bc5f]" aria-hidden>*</span>
          <span className="truncate text-base font-bold tracking-tight text-[#f7bc5f] sm:text-lg">Jewelry Design Studio</span>
        </div>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-[#17191F] text-xs font-bold text-[#D1B873]">
          JS
        </div>
      </header>

      <aside className="fixed left-0 top-0 z-30 hidden h-full w-72 flex-col border-r border-white/5 bg-[#17191F] px-2 py-6 pt-20 shadow-2xl lg:flex">
        <div className="mb-8 px-4">
          <h2 className="text-xl font-bold text-[#f7bc5f]">Luxe Jewelry Admin</h2>
          <p className="mt-1 text-sm text-[#c2c6d6]">Global Manager</p>
          <span className="mt-3 inline-block rounded border border-[#dec47e]/20 bg-[#56450a]/50 px-2 py-1 text-[11px] text-[#dec47e]">Premium Tier</span>
        </div>
        {[
          { label: "Quotes", href: "/owner" },
          { label: "Customers", href: "#" },
          { label: "Account", href: "/owner/account" }
        ].map((item, index) => (
          <Link
            key={item.label}
            href={item.href}
            className={`mx-2 flex items-center gap-3 rounded-lg px-4 py-3 transition ${
              index === 0 ? "translate-x-1 bg-[#56450a] text-[#dec47e]" : "text-[#c2c6d6] hover:bg-white/5"
            }`}
          >
            <span aria-hidden>{index === 0 ? "*" : "o"}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </aside>

      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-8 px-4 md:px-6">
        <section className="min-w-0">
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Store Dashboard</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Review designs and send customer quotes</p>
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

        <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <details open className="group min-w-0">
            <summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#272a31] p-4 transition hover:bg-[#363941]">
              <div className="min-w-0">
                <h2 className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8c909f]">Quote Requests</h2>
                <p className="mt-1 text-sm text-[#c2c6d6]">Customers waiting for pricing</p>
              </div>
              <span className="flex-shrink-0 text-[#f7bc5f] transition group-open:rotate-180" aria-hidden>v</span>
            </summary>
            <div className="mt-4 flex min-w-0 flex-col gap-5">
              {visibleQuotes.map(quote => <QuoteCard key={quote.id} quote={quote} />)}
              {visibleQuotes.length === 0 && (
                <div className="rounded-xl border border-white/5 bg-[#17191F] p-6 text-center text-sm text-[#8c909f] sm:p-8">
                  No quote requests match the current filters.
                </div>
              )}
            </div>
          </details>

          <details open className="group min-w-0">
            <summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#272a31] p-4 transition hover:bg-[#363941]">
              <div className="min-w-0">
                <h2 className="text-sm font-medium text-[#e1e2ec]">Generate Video</h2>
                <p className="mt-1 text-sm text-[#8c909f]">Name pendant drafts ready for video</p>
              </div>
              <Link href="/owner/videos" className="flex-shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-[#c2c6d6] hover:bg-white/10">
                All videos
              </Link>
              <span className="flex-shrink-0 text-[#8c909f] transition group-open:rotate-180" aria-hidden>v</span>
            </summary>
            <div className="mt-3 flex min-w-0 flex-col gap-2">
              {visibleResults.map(row => <GenerationCard key={row.id} row={row} />)}
              {visibleResults.length === 0 && (
                <div className="rounded-xl border border-white/5 bg-[#17191F] p-6 text-center text-sm text-[#8c909f]">
                  No name pendant generations match the current filters.
                </div>
              )}
            </div>
          </details>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
