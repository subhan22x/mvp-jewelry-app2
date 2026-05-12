import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import { isOwnerSessionValue, OWNER_SESSION_COOKIE } from "@/src/lib/owner-auth";
import OwnerLoginForm from "./OwnerLoginForm";
import SendQuoteForm from "./SendQuoteForm";
import OwnerFrame from "./OwnerFrame";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  filter?: string;
};

type QuoteRow = Awaited<ReturnType<typeof getOwnerData>>["quoteRequests"][number];

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
    natural_diamonds: "Natural Diamonds",
    lab_diamonds: "Lab Diamonds",
    moissanite: "Moissanite"
  };
  return value ? labels[value] ?? value : "n/a";
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
    quote.size,
    quote.metalType,
    quote.stoneType,
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

async function getOwnerData() {
  const accountId = getDefaultAccountId();
  const [quoteCount, totalGenerations, pendingQuotes, sentQuotes, quoteRequests] = await Promise.all([
    prisma.quoteRequest.count({ where: { accountId } }),
    prisma.result.count({ where: { accountId } }),
    prisma.quoteRequest.count({ where: { accountId, status: "pending" } }),
    prisma.quoteRequest.count({ where: { accountId, status: "sent" } }),
    prisma.quoteRequest.findMany({
      where: { accountId },
      orderBy: [{ createdAt: "desc" }],
      take: 80
    })
  ]);

  return {
    metrics: { quoteCount, totalGenerations, pendingQuotes, sentQuotes },
    quoteRequests
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
              <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Size</span>
              <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{sizeLabel(quote.size)}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Metal Type</span>
              <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(quote.metalType)}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Stone Type</span>
              <span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(quote.stoneType)}</span>
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

  const currentQuery = searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : "";
  const chipHref = (nextFilter: string) => `/owner?filter=${nextFilter}${currentQuery}`;

  return (
    <OwnerFrame active="Quotes">
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

        <section className="grid min-w-0 gap-6">
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
        </section>
      </div>

      <BottomNav />
    </OwnerFrame>
  );
}
