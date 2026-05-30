# Owner Dashboard — Frontend Extraction for Google Stitch

## 1. Project Context

| Property | Value |
|----------|-------|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS 3.4 + inline styles (where noted) |
| React | 18.3.1 |
| Fonts | Figtree (Google), Perfectly Nostalgic Bold Italic (local) |
| Path alias | `@/*` maps to repo root |

### Theme Tokens (used throughout)

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#101114` | Page background |
| Surface | `#17191F` | Cards, panels |
| Surface hover | `#1d2028` | Card hover |
| Accent Gold | `#f7bc5f` / `#dec47e` / `#D1B873` | Primary accent, highlights |
| Accent Blue | `#3B82F6` | Buttons, links |
| Text primary | `#e1e2ec` | Headings, primary text |
| Text secondary | `#c2c6d6` | Subheadings |
| Text muted | `#8c909f` | Labels, metadata |
| Border subtle | `border-white/5` / `border-white/10` | Card borders |
| Success | `text-emerald-200` | Sent state |
| Danger | `text-red-200` | Failed state |

---

## 2. Mock Data Layer

These stubs replace all Prisma and server-only imports so components render without a backend.

### 2.1 Owner Auth Stub

```typescript
// src/lib/owner-auth.ts
export const OWNER_SESSION_COOKIE = "owner_session";
export function isOwnerSessionValue(value: string | undefined | null) {
  return true; // Always authenticated for Stitch preview
}
export function isOwnerRequestAuthenticated(req: Request) {
  return true;
}
```

### 2.2 Account Stub

```typescript
// src/lib/account.ts
export const DEMO_ACCOUNT_ID = "demo-account";
export function getDefaultAccountId() {
  return DEMO_ACCOUNT_ID;
}
```

### 2.3 Prompt Mode Stub

```typescript
// src/lib/prompt-mode.ts
export type PromptMode = "json" | "natural_language";
export async function getNamePromptMode(): Promise<PromptMode> {
  return "json";
}
```

### 2.4 Prisma Stub

```typescript
// server/db/client.ts
export const prisma = {} as any;
```

### 2.5 Mock Data Objects

```typescript
// Mock Quote Requests (used by Dashboard)
const MOCK_QUOTES = [
  {
    id: "quote_001",
    customerName: "Alex Rivera",
    customerEmail: "alex@example.com",
    text: "ALEX",
    styleId: "lexy",
    pendantFinish: "iced",
    primaryMetal: "yellow_gold",
    secondaryMetal: "white_gold",
    size: "3_4_5_inches",
    metalType: "14k",
    stoneType: "lab_diamonds",
    diamondQuality: "vvs",
    plainColor: null,
    plainMetal: null,
    plainKarat: null,
    plainChain: null,
    productType: "name",
    status: "pending",
    quotedPriceCents: null,
    quoteNotes: null,
    designedImageUrl: "/generated/sample-1.jpg",
    createdAt: new Date(),
  },
  {
    id: "quote_002",
    customerName: "Maria Chen",
    customerEmail: "maria@example.com",
    text: "MARIA",
    styleId: "king",
    pendantFinish: "iced",
    primaryMetal: "rose_gold",
    secondaryMetal: null,
    size: "2_3_inches",
    metalType: "18k",
    stoneType: "natural_diamonds",
    diamondQuality: "vs",
    plainColor: null,
    plainMetal: null,
    plainKarat: null,
    plainChain: null,
    productType: "name",
    status: "sent",
    quotedPriceCents: 125000,
    quoteNotes: "2-week turnaround. Includes box chain.",
    designedImageUrl: "/generated/sample-2.jpg",
    createdAt: new Date(Date.now() - 86400000 * 2),
  },
  {
    id: "quote_003",
    customerName: "James Wilson",
    customerEmail: "jw@example.com",
    text: "",
    styleId: null,
    pendantFinish: "plain",
    primaryMetal: null,
    secondaryMetal: null,
    size: null,
    metalType: null,
    stoneType: null,
    diamondQuality: null,
    plainColor: "gold",
    plainMetal: "gold",
    plainKarat: "14k",
    plainChain: "rope",
    productType: "picture",
    status: "pending",
    quotedPriceCents: null,
    quoteNotes: null,
    designedImageUrl: null,
    createdAt: new Date(Date.now() - 3600000),
  },
];

// Mock Results (used by Studio)
const MOCK_RESULTS = [
  {
    id: "res_001",
    variant: 1,
    imageUrl: "/generated/sample-1.jpg",
    status: "succeeded",
    createdAt: new Date(),
    request: {
      text: "ALEX",
      productType: "name",
      styleId: "lexy",
      Videos: [] as any[],
    },
  },
  {
    id: "res_002",
    variant: 2,
    imageUrl: "/generated/sample-2.jpg",
    status: "succeeded",
    createdAt: new Date(Date.now() - 86400000),
    request: {
      text: "MARIA",
      productType: "name",
      styleId: "king",
      Videos: [{ id: "vid_001", sourceResultId: "res_002", status: "succeeded" }],
    },
  },
];

// Mock Video Jobs (used by Studio + Videos)
const MOCK_VIDEO_JOBS = [
  {
    id: "vid_001",
    sourceImageUrl: "/generated/sample-2.jpg",
    videoUrl: "/generated/video-1.mp4",
    remoteVideoUrl: null,
    status: "succeeded",
    error: null,
    durationMs: 15420,
    createdAt: new Date(Date.now() - 86400000 * 3),
    request: {
      text: "MARIA",
      styleId: "king",
      primaryMetal: "rose_gold",
      secondaryMetal: null,
      emblem: "crown",
    },
  },
  {
    id: "vid_002",
    sourceImageUrl: "/generated/sample-1.jpg",
    videoUrl: null,
    remoteVideoUrl: null,
    status: "pending",
    error: null,
    durationMs: null,
    createdAt: new Date(),
    request: {
      text: "ALEX",
      styleId: "lexy",
      primaryMetal: "yellow_gold",
      secondaryMetal: "white_gold",
      emblem: "none",
    },
  },
];

// Mock Collections (used by Collections)
const MOCK_COLLECTIONS = [
  {
    id: "col_001",
    title: "Signature Pendants",
    slug: "signature-pendants",
    Products: [
      { id: "p_001", name: "Lexy Custom", imageUrl: "/generated/sample-1.jpg", sortOrder: 0 },
      { id: "p_002", name: "King Custom", imageUrl: "/generated/sample-2.jpg", sortOrder: 1 },
    ],
  },
  {
    id: "col_002",
    title: "Chains",
    slug: "chains",
    Products: [],
  },
];

// Mock Account / Profile
const MOCK_ACCOUNT = {
  id: "demo-account",
  name: "Luxe Jewelry",
  slug: "luxe-jewelry",
  StoreProfile: {
    displayName: "Luxe Jewelry Co.",
    instagramHandle: "luxe.jewelry",
    headline: "Custom iced pendants & chains since 2018.",
    coverImageUrl: "/generated/cover.jpg",
    profileImageUrl: "/generated/profile.jpg",
  },
  StoreServices: [
    { id: "svc_001", title: "Custom Name Pendants", isActive: true },
    { id: "svc_002", title: "Picture Pendants", isActive: true },
    { id: "svc_003", title: "Chain Repair", isActive: false },
  ],
};
```

---

## 3. Layout Shell — OwnerFrame

**File:** `app/owner/OwnerFrame.tsx`

Shared layout wrapper used by every authenticated owner page. Provides a responsive sidebar (desktop) + top header (all breakpoints) + bottom nav (mobile).

```tsx
"use client";

import Link from "next/link";
import type { ReactNode } from "react";

const ownerNav = [
  { label: "Quotes", href: "/owner" },
  { label: "Studio", href: "/owner/studio" },
  // VVS Studio excluded per request
  { label: "Reviews", href: "/owner/reviews" },
  { label: "Collections", href: "/owner/collections" },
  { label: "Profile", href: "/owner/profile" },
  { label: "Settings", href: "/owner/settings" },
];

export default function OwnerFrame({ active, children }: { active: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh max-w-full overflow-x-hidden bg-[#101114] pb-28 pt-20 text-[#e1e2ec] antialiased selection:bg-[#f7bc5f] selection:text-[#101114] lg:pl-72">
      {/* Top header */}
      <header className="fixed left-0 top-0 z-40 flex h-16 w-full max-w-full items-center justify-between gap-3 overflow-hidden border-b border-white/10 bg-[#101114] px-4 shadow-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-[#f7bc5f]" aria-hidden>*</span>
          <span className="truncate text-base font-bold tracking-tight text-[#f7bc5f] sm:text-lg">Jewelry Design Studio</span>
        </div>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-[#17191F] text-xs font-bold text-[#D1B873]">
          JS
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-full w-72 flex-col border-r border-white/5 bg-[#17191F] px-2 py-6 pt-20 shadow-2xl lg:flex">
        <div className="mb-8 px-4">
          <h2 className="text-xl font-bold text-[#f7bc5f]">Luxe Jewelry Admin</h2>
          <p className="mt-1 text-sm text-[#c2c6d6]">Global Manager</p>
          <span className="mt-3 inline-block rounded border border-[#dec47e]/20 bg-[#56450a]/50 px-2 py-1 text-[11px] text-[#dec47e]">Premium Tier</span>
        </div>
        <nav className="flex flex-col gap-2">
          {ownerNav.map(item => {
            const isActive = item.label === active;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`mx-2 flex items-center gap-3 rounded-lg px-4 py-3 transition ${
                  isActive ? "translate-x-1 bg-[#56450a] text-[#dec47e]" : "text-[#c2c6d6] hover:bg-white/5"
                }`}
              >
                <span aria-hidden>{isActive ? "*" : "o"}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {children}
    </main>
  );
}
```

---

## 4. Auth Layer — OwnerLoginForm

**File:** `app/owner/OwnerLoginForm.tsx`

Standalone login screen shown when owner is not authenticated. Uses `/api/owner-auth` endpoint.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerLoginForm() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/owner-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Unable to sign in.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#101114] px-4 text-[#e1e2ec]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-[#D1B873]/25 bg-[#17191F] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
      >
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D1B873]">Owner</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Store Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-[#c2c6d6]">
            Enter the owner access code to review quote requests and generation activity.
          </p>
        </div>

        <label htmlFor="owner-access-code" className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">
          Access code
        </label>
        <input
          id="owner-access-code"
          type="password"
          value={accessCode}
          onChange={event => setAccessCode(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-white/35"
          placeholder="Enter code"
          required
        />

        {error && (
          <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full rounded-2xl bg-[#3B82F6] px-5 py-3 text-base font-semibold text-white shadow-[0_0_25px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? "checking..." : "enter dashboard"}
        </button>
      </form>
    </main>
  );
}
```

---

## 5. Dashboard — /owner

**File:** `app/owner/page.tsx`

Primary entry point. Displays metrics cards, search/filter bar, and a scrollable list of QuoteCards. Each QuoteCard shows the designed image, customer info, material specs, and a Send Quote action.

```tsx
"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import OwnerFrame from "./OwnerFrame";
import SendQuoteForm from "./SendQuoteForm";

// ── utilities ────────────────────────────────────────────────────
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
    gold: "Gold", silver: "Silver", rose_gold: "Rose Gold", gold_plated: "Gold Plated",
    "10k": "10K", "14k": "14K", "18k": "18K",
    natural_diamonds: "Natural Diamonds", lab_diamonds: "Lab Diamonds", moissanite: "Moissanite",
    rope: "Rope chain", box: "Box chain", snake: "Snake chain", cable: "Cable chain",
    station: "Station chain", bar_link_tube_station: "Bar link chain / tube station chain",
    figaro_oval_link: "Figaro style / oval link chain"
  };
  return value ? labels[value] ?? value : "n/a";
}

function statusClass(status: string) {
  if (status === "sent") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
  if (status === "failed") return "border-red-300/30 bg-red-400/10 text-red-200";
  if (status === "succeeded") return "border-blue-300/30 bg-blue-400/10 text-blue-200";
  return "border-[#f7bc5f]/40 bg-[#1D120C]/90 text-[#f7bc5f]";
}

// ── sub-components ───────────────────────────────────────────────
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

function QuoteCard({ quote }: { quote: typeof MOCK_QUOTES[0] }) {
  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-[#D1B873]/30 bg-[#17191F] shadow-[0_8px_30px_rgba(0,0,0,0.4)] md:flex-row">
      {/* Image column */}
      <div className="relative h-64 w-full bg-black md:h-auto md:w-2/5">
        {quote.designedImageUrl ? (
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

      {/* Details column */}
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

            {quote.pendantFinish === "plain" ? (
              <>
                <div className="flex min-w-0 flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Finish</span><span className="break-words text-[15px] font-medium text-[#e1e2ec]">Plain</span></div>
                <div className="flex min-w-0 flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Color</span><span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(quote.plainColor)}</span></div>
                <div className="flex min-w-0 flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Metal</span><span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(quote.plainMetal)}</span></div>
                <div className="flex min-w-0 flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Karat</span><span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(quote.plainKarat)}</span></div>
                <div className="flex min-w-0 flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Chain</span><span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(quote.plainChain)}</span></div>
              </>
            ) : (
              <>
                <div className="flex min-w-0 flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Metal Colors</span><span className="break-words text-[15px] font-medium text-[#e1e2ec]">{metalLabel(quote.primaryMetal, quote.secondaryMetal)}</span></div>
                <div className="flex min-w-0 flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Size</span><span className="break-words text-[15px] font-medium text-[#e1e2ec]">{sizeLabel(quote.size)}</span></div>
                <div className="flex min-w-0 flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Metal Type</span><span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(quote.metalType)}</span></div>
                <div className="flex min-w-0 flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Stone Type</span><span className="break-words text-[15px] font-medium text-[#e1e2ec]">{materialSpecLabel(quote.stoneType)}</span></div>
                <div className="flex min-w-0 flex-col gap-1"><span className="text-[10px] uppercase tracking-wider text-[#8c909f]">Diamond Tier</span><span className="break-words text-[15px] font-medium text-[#e1e2ec]">{quote.diamondQuality?.toUpperCase() ?? "n/a"}</span></div>
              </>
            )}
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

// ── main page ────────────────────────────────────────────────────
export default function OwnerDashboardPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const visibleQuotes = useMemo(() => {
    return MOCK_QUOTES.filter(quote => {
      const haystack = [
        quote.id, quote.customerName, quote.customerEmail, quote.text,
        quote.styleId, quote.pendantFinish, quote.primaryMetal, quote.secondaryMetal,
        quote.size, quote.metalType, quote.stoneType, quote.plainColor,
        quote.plainMetal, quote.plainKarat, quote.plainChain, quote.productType
      ].join(" ").toLowerCase();
      if (query && !haystack.includes(query.toLowerCase())) return false;
      if (filter === "pending" && quote.status !== "pending") return false;
      if (filter === "sent" && quote.status !== "sent") return false;
      if (filter === "today" && !isToday(quote.createdAt)) return false;
      if (filter === "name" && quote.productType !== "name") return false;
      if (filter === "picture" && quote.productType !== "picture") return false;
      return true;
    });
  }, [query, filter]);

  const metrics = {
    quoteCount: MOCK_QUOTES.length,
    totalGenerations: MOCK_RESULTS.length,
    pendingQuotes: MOCK_QUOTES.filter(q => q.status === "pending").length,
    sentQuotes: MOCK_QUOTES.filter(q => q.status === "sent").length,
  };

  return (
    <OwnerFrame active="Quotes">
      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-8 px-4 md:px-6">
        {/* Header */}
        <section className="min-w-0">
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Store Dashboard</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Review designs and send customer quotes</p>
        </section>

        {/* Metrics */}
        <section className="grid min-w-0 grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Quote Requests" value={metrics.quoteCount} />
          <MetricCard label="Total Generations" value={metrics.totalGenerations} />
          <MetricCard label="Pending Quotes" value={metrics.pendingQuotes} accent />
          <MetricCard label="Sent Quotes" value={metrics.sentQuotes} />
        </section>

        {/* Search & Filters */}
        <section className="flex min-w-0 flex-col gap-4">
          <div className="relative flex h-12 w-full min-w-0 items-center rounded-xl border border-white/10 bg-black/45 px-4 shadow-inner transition focus-within:border-white/30">
            <span className="mr-3 flex-shrink-0 text-[#8c909f]" aria-hidden>search</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="min-w-0 flex-1 border-none bg-transparent text-base text-[#e1e2ec] outline-none placeholder:text-white/30 focus:ring-0"
              placeholder="Search customer, text, or style"
            />
          </div>
          <div className="-mx-4 flex max-w-[100vw] gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(["all", "pending", "sent", "today", "name", "picture"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
                  filter === f
                    ? "border-[#dec47e]/30 bg-[#56450a] text-[#dec47e] shadow-[0_0_10px_rgba(201,148,59,0.15)]"
                    : "border-white/5 bg-[#272a31] text-[#c2c6d6] hover:bg-[#363941]"
                }`}
              >
                {f === "all" ? "All" : f === "name" ? "Name Pendants" : f === "picture" ? "Picture Pendants" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {/* Quote list */}
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
```

---

## 6. SendQuoteForm (Modal)

**File:** `app/owner/SendQuoteForm.tsx`

Client component. Opens a centered modal to enter price and notes, then PATCHes the quote.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

 type Props = {
  quoteId: string;
  status: string;
  quotedPriceCents: number | null;
  quoteNotes: string | null;
};

function centsToDollars(value: number | null) {
  return typeof value === "number" ? (value / 100).toFixed(2) : "";
}

export default function SendQuoteForm({ quoteId, status, quotedPriceCents, quoteNotes }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(centsToDollars(quotedPriceCents));
  const [notes, setNotes] = useState(quoteNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(status === "sent");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const parsedPrice = Number.parseFloat(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setSubmitting(false);
      setError("Enter a valid quote price.");
      return;
    }

    try {
      const response = await fetch(`/api/quote-requests/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotedPriceCents: Math.round(parsedPrice * 100),
          quoteNotes: notes.trim(),
          status: "sent"
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Unable to send quote.");
      setSuccess(true);
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send quote.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-white transition ${
          success
            ? "bg-emerald-600/90 hover:bg-emerald-500"
            : "bg-[#3B82F6] shadow-[0_0_25px_rgba(59,130,246,0.35)] hover:bg-blue-400"
        }`}
      >
        <span aria-hidden>{success ? "ok" : "send"}</span>
        {success ? "Quote sent" : "Send Quote"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Send quote"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-3xl border border-[#D1B873]/25 bg-[#17191F] p-6 text-[#e1e2ec] shadow-[0_28px_80px_rgba(0,0,0,0.65)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D1B873]">Quote</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Send to Customer</h2>
                <p className="mt-1 text-sm text-[#c2c6d6]">Save the price and mark this quote as sent.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-sm text-white/75 hover:border-white/30"
              >
                close
              </button>
            </div>

            <label htmlFor={`quote-price-${quoteId}`} className="mt-5 block text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">
              Quote price
            </label>
            <div className="mt-2 flex items-center rounded-2xl border border-white/10 bg-black/45 px-4 focus-within:border-white/35">
              <span className="text-white/45">$</span>
              <input
                id={`quote-price-${quoteId}`}
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={event => setPrice(event.target.value)}
                className="w-full border-0 bg-transparent px-2 py-3 text-base text-white outline-none focus:ring-0"
                placeholder="450.00"
                required
              />
            </div>

            <label htmlFor={`quote-notes-${quoteId}`} className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">
              Message to customer
            </label>
            <textarea
              id={`quote-notes-${quoteId}`}
              value={notes}
              onChange={event => setNotes(event.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-white/35"
              placeholder="Optional note about production time, materials, or next steps."
            />

            {error && (
              <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full rounded-2xl bg-[#3B82F6] px-5 py-3 text-base font-semibold text-white transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "saving..." : "Send to Customer"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
```

---

## 7. Studio — /owner/studio

**File:** `app/owner/studio/page.tsx`

Hub for generated drafts and video jobs. Links to VVS Studio (excluded from extraction), Videos list, and shows recent results with inline video generation buttons.

```tsx
"use client";

import Link from "next/link";
import OwnerFrame from "../OwnerFrame";
import GenerationVideoCard from "../GenerationVideoCard";

function formatDate(value: Date | null) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(value);
}

export default function OwnerStudioPage() {
  const recentResults = MOCK_RESULTS;
  const videoJobs = MOCK_VIDEO_JOBS;

  return (
    <OwnerFrame active="Studio">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-8 px-4 md:px-6">
        <section>
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Studio</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Generated drafts, video jobs, and creative production tools.</p>
        </section>

        {/* Quick links / stats row */}
        <section className="grid gap-4 md:grid-cols-3">
          <Link href="/owner/videos" className="rounded-xl border border-[#D1B873]/20 bg-[#17191F] p-5 hover:bg-[#1d2028]">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7bc5f]">Videos</p>
            <h2 className="mt-3 text-xl font-bold">Pendant video jobs</h2>
            <p className="mt-2 text-sm text-[#8c909f]">View loading states, completed clips, downloads, and share links.</p>
          </Link>
          <div className="rounded-xl border border-white/5 bg-[#17191F] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8c909f]">Images</p>
            <h2 className="mt-3 text-xl font-bold">{recentResults.length}</h2>
            <p className="mt-2 text-sm text-[#8c909f]">Recent name pendant drafts.</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#17191F] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8c909f]">Queue</p>
            <h2 className="mt-3 text-xl font-bold">{videoJobs.filter(job => job.status === "pending").length}</h2>
            <p className="mt-2 text-sm text-[#8c909f]">Pending video jobs.</p>
          </div>
        </section>

        {/* Generate video panel + video jobs sidebar */}
        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <details open className="group rounded-xl border border-white/5 bg-[#17191F] p-4">
            <summary className="flex min-w-0 cursor-pointer list-none items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8c909f]">Generate Video</h2>
                <p className="mt-1 text-sm text-[#c2c6d6]">Name pendant drafts ready for video</p>
              </div>
              <Link href="/owner/videos" className="flex-shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-[#c2c6d6] hover:bg-white/10">
                All videos
              </Link>
            </summary>
            <div className="mt-4 flex min-w-0 flex-col gap-3">
              {recentResults.map(result => (
                <GenerationVideoCard key={result.id} row={result} />
              ))}
              {recentResults.length === 0 && <p className="text-sm text-[#8c909f]">No name pendant drafts are ready for video yet.</p>}
            </div>
          </details>

          <div className="rounded-xl border border-white/5 bg-[#17191F] p-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-[#8c909f]">Video Jobs</h2>
            <div className="mt-4 flex flex-col gap-3">
              {videoJobs.map(job => (
                <Link key={job.id} href={`/owner/videos/${job.id}`} className="rounded-lg border border-white/5 bg-[#101114] p-3 hover:bg-white/5">
                  <p className="truncate text-sm font-semibold">{job.request.text}</p>
                  <p className="mt-1 text-xs text-[#8c909f]">{job.status} / {formatDate(job.createdAt)}</p>
                </Link>
              ))}
              {videoJobs.length === 0 && <p className="text-sm text-[#8c909f]">No video jobs yet.</p>}
            </div>
          </div>
        </section>
      </div>
    </OwnerFrame>
  );
}
```

---

## 8. GenerationVideoCard + GenerateVideoButton

**Files:** `app/owner/GenerationVideoCard.tsx` + `app/owner/GenerateVideoButton.tsx`

Inline cards in Studio showing a generation thumbnail + metadata, with a button to start a video job.

### 8.1 GenerationVideoCard

```tsx
import GenerateVideoButton from "./GenerateVideoButton";

 type GenerationVideoCardProps = {
  row: {
    id: string;
    variant: number;
    imageUrl: string | null;
    status: string;
    createdAt: Date;
    request: {
      text: string;
      productType: string;
      uploadFileName?: string | null;
      styleId: string;
      Videos: Array<{
        id: string;
        sourceResultId: string | null;
        status: string;
      }>;
    };
  };
};

function formatDate(value: Date | null) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function statusClass(status: string) {
  if (status === "sent") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
  if (status === "failed") return "border-red-300/30 bg-red-400/10 text-red-200";
  if (status === "succeeded") return "border-blue-300/30 bg-blue-400/10 text-blue-200";
  return "border-[#f7bc5f]/40 bg-[#1D120C]/90 text-[#f7bc5f]";
}

export default function GenerationVideoCard({ row }: GenerationVideoCardProps) {
  const videoJobsForImage = row.request.Videos.filter(video => video.sourceResultId === row.id);
  const completedCount = videoJobsForImage.filter(video => video.status === "succeeded").length;
  const title = row.request.productType === "picture" ? row.request.uploadFileName ?? row.request.text : row.request.text;

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/5 bg-[#17191F] p-3 transition hover:bg-white/[0.02]">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black">
          {row.imageUrl ? (
            <img src={row.imageUrl} alt={`${row.request.text} generation`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-white/30">No image</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h4 className="truncate text-[15px] font-semibold text-[#e1e2ec]">{title}</h4>
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
```

### 8.2 GenerateVideoButton

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

 type Props = {
  resultId: string;
  attemptCount: number;
  completedCount: number;
  disabled?: boolean;
};

export default function GenerateVideoButton({ resultId, attemptCount, completedCount, disabled = false }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAttempts = attemptCount > 0;
  const label = completedCount > 0
    ? "Generate another video"
    : hasAttempts
      ? "Generate again"
      : "Generate Video";

  async function startVideoGeneration() {
    setSubmitting(true);
    setConfirming(false);
    setError(null);
    try {
      const response = await fetch("/api/owner/video-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Unable to start video generation.");
      router.push(`/owner/videos/${data.videoJobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start video generation.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <button
        type="button"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        disabled={disabled || submitting}
        className="min-h-10 rounded-lg bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-60"
      >
        {submitting ? "Starting..." : label}
      </button>
      {confirming && (
        <div className="rounded-lg border border-[#f7bc5f]/40 bg-[#1D120C] p-3 text-xs text-[#f7bc5f]">
          <p className="font-semibold">Are you sure?</p>
          <p className="mt-1 leading-relaxed text-[#dec47e]">Generating a video uses paid Wavespeed processing.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={startVideoGeneration}
              disabled={submitting}
              className="rounded-full bg-[#f7bc5f] px-3 py-1.5 font-semibold text-[#101114] hover:bg-[#ffd88a] disabled:cursor-wait disabled:opacity-60"
            >
              Yes, generate
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={submitting}
              className="rounded-full border border-[#f7bc5f]/30 px-3 py-1.5 font-semibold text-[#dec47e] hover:bg-white/5 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {hasAttempts && (
        <span className="text-[10px] leading-snug text-[#8c909f]">
          Pressed before: {attemptCount} job{attemptCount === 1 ? "" : "s"}
        </span>
      )}
      {error && (
        <span className="rounded border border-red-400/30 bg-red-500/10 px-2 py-1 text-[10px] leading-snug text-red-100">
          {error}
        </span>
      )}
    </div>
  );
}
```

---

## 9. Videos — /owner/videos

**File:** `app/owner/videos/page.tsx`

Grid of all video jobs. Each card shows source image + resulting video (if ready), status badge, and action buttons.

```tsx
"use client";

import Link from "next/link";

function formatDate(value: Date | null) {
  if (!value) return "n/a";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);
}

function statusClass(status: string) {
  if (status === "succeeded") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
  if (status === "failed") return "border-red-300/30 bg-red-400/10 text-red-200";
  return "border-[#f7bc5f]/40 bg-[#1D120C]/90 text-[#f7bc5f]";
}

export default function OwnerVideosPage() {
  const videos = MOCK_VIDEO_JOBS;

  return (
    <main className="min-h-dvh bg-[#101114] px-4 py-8 text-[#e1e2ec] md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/owner" className="text-sm text-[#adc6ff] hover:text-white">Back to owner dashboard</Link>
            <h1 className="mt-2 text-3xl font-bold">Pendant Videos</h1>
            <p className="mt-1 text-sm text-[#8c909f]">All video jobs, including pending, completed, and failed attempts.</p>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {videos.map(video => (
            <article key={video.id} className="min-w-0 overflow-hidden rounded-xl border border-white/5 bg-[#17191F]">
              <div className="grid grid-cols-2 bg-black">
                <div className="aspect-square border-r border-white/10">
                  <img src={video.sourceImageUrl} alt={`${video.request.text} source`} className="h-full w-full object-cover" />
                </div>
                <div className="aspect-square">
                  {video.videoUrl ? (
                    <video src={video.videoUrl} controls playsInline className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-xs text-white/35">
                      No video file yet
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{video.request.text}</h2>
                    <p className="mt-1 truncate text-xs text-[#8c909f]">{video.request.styleId} / {video.request.primaryMetal}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded border px-2 py-1 text-[10px] font-semibold ${statusClass(video.status)}`}>
                    {video.status}
                  </span>
                </div>
                <p className="text-xs text-[#8c909f]">{formatDate(video.createdAt)}</p>
                {video.error && (
                  <p className="line-clamp-2 rounded border border-red-400/30 bg-red-500/10 px-2 py-1 text-xs text-red-100">{video.error}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Link href={`/owner/videos/${video.id}`} className="rounded-full bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-white hover:bg-blue-400">
                    View
                  </Link>
                  {video.videoUrl && (
                    <a href={video.videoUrl} download className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-[#e1e2ec] hover:bg-white/10">
                      Download
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>

        {videos.length === 0 && (
          <div className="rounded-xl border border-white/5 bg-[#17191F] p-8 text-center text-sm text-[#8c909f]">
            No video jobs have been created yet.
          </div>
        )}
      </div>
    </main>
  );
}
```

---

## 10. Video Detail — /owner/videos/[videoJobId]

**Files:** `app/owner/videos/[videoJobId]/page.tsx` + `VideoJobStatus.tsx`

Detail view with live polling. Shows source image on the left, video player / progress on the right.

### 10.1 Page shell

```tsx
"use client";

import Link from "next/link";
import VideoJobStatus from "../VideoJobStatus";

export default function OwnerVideoJobPage({ params }: { params: { videoJobId: string } }) {
  const video = MOCK_VIDEO_JOBS.find(v => v.id === params.videoJobId) ?? MOCK_VIDEO_JOBS[0];

  return (
    <main className="min-h-dvh bg-[#101114] px-4 py-8 text-[#e1e2ec] md:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/owner/videos" className="text-sm text-[#adc6ff] hover:text-white">Back to videos</Link>
            <h1 className="mt-2 text-3xl font-bold">Pendant Video</h1>
          </div>
          <Link href="/owner" className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#c2c6d6] hover:bg-white/10">
            Owner dashboard
          </Link>
        </div>

        <VideoJobStatus
          initialJob={{
            id: video.id,
            sourceImageUrl: video.sourceImageUrl,
            videoUrl: video.videoUrl,
            remoteVideoUrl: video.remoteVideoUrl,
            status: video.status,
            error: video.error,
            durationSeconds: typeof video.durationMs === "number" ? Number((video.durationMs / 1000).toFixed(2)) : null,
            done: video.status === "succeeded" || video.status === "failed",
            request: video.request,
          }}
        />
      </div>
    </main>
  );
}
```

### 10.2 VideoJobStatus (client, live polling)

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";

 type VideoJob = {
  id: string;
  sourceImageUrl: string;
  videoUrl: string | null;
  remoteVideoUrl: string | null;
  status: string;
  error: string | null;
  durationSeconds: number | null;
  done: boolean;
  request: {
    text: string;
    styleId: string;
    primaryMetal: string;
    secondaryMetal: string | null;
    emblem: string;
  };
};

 type Props = {
  initialJob: VideoJob;
};

function statusLabel(status: string) {
  if (status === "succeeded") return "Completed";
  if (status === "failed") return "Failed";
  return "Generating";
}

export default function VideoJobStatus({ initialJob }: Props) {
  const [job, setJob] = useState(initialJob);
  const [copyLabel, setCopyLabel] = useState("Share");
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return job.videoUrl ?? "";
    return job.videoUrl ? new URL(job.videoUrl, window.location.origin).toString() : window.location.href;
  }, [job.videoUrl]);

  useEffect(() => {
    if (job.done) return;

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/owner/video-jobs/${job.id}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      setJob(data);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [job.done, job.id]);

  async function handleShare() {
    if (navigator.share && job.videoUrl) {
      await navigator.share({ title: "Pendant video", url: shareUrl });
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Share"), 1600);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="min-w-0 rounded-xl border border-white/5 bg-[#17191F] p-4">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
          <img src={job.sourceImageUrl} alt={`${job.request.text} source pendant`} className="aspect-square w-full object-cover" />
        </div>
        <div className="mt-4 space-y-2 text-sm text-[#c2c6d6]">
          <div className="font-semibold text-[#e1e2ec]">{job.request.text}</div>
          <div>{job.request.styleId} / {job.request.primaryMetal}{job.request.secondaryMetal ? ` + ${job.request.secondaryMetal}` : ""}</div>
          <div>Emblem: {job.request.emblem}</div>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border border-white/5 bg-[#17191F] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8c909f]">Video Job</p>
            <h1 className="mt-2 text-2xl font-bold text-[#e1e2ec]">{statusLabel(job.status)}</h1>
          </div>
          <span className="rounded-full border border-[#f7bc5f]/30 bg-[#1D120C] px-3 py-1 text-xs font-semibold text-[#f7bc5f]">
            {job.status}
          </span>
        </div>

        {!job.done && (
          <div className="mt-6">
            <div className="h-3 overflow-hidden rounded-full bg-black/55">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-[#3B82F6]" />
            </div>
            <p className="mt-3 text-sm text-[#8c909f]">Wavespeed is generating the product video. This page updates automatically.</p>
          </div>
        )}

        {job.status === "failed" && (
          <div className="mt-6 rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            {job.error ?? "Video generation failed."}
          </div>
        )}

        {job.videoUrl && (
          <div className="mt-6">
            <video src={job.videoUrl} controls playsInline className="aspect-video w-full rounded-lg bg-black" />
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={job.videoUrl} download className="rounded-full bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-400">
                Download
              </a>
              <button type="button" onClick={handleShare} className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-[#e1e2ec] hover:bg-white/10">
                {copyLabel}
              </button>
            </div>
            {job.durationSeconds && (
              <p className="mt-3 text-xs text-[#8c909f]">Generated in {job.durationSeconds.toFixed(2)} seconds.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
```

---

## 11. Collections — /owner/collections

**File:** `app/owner/collections/page.tsx`

Grid of product collections. Each card shows title, slug, piece count, and up to 6 product thumbnails.

```tsx
"use client";

import OwnerFrame from "../OwnerFrame";

export default function OwnerCollectionsPage() {
  const collections = MOCK_COLLECTIONS;

  return (
    <OwnerFrame active="Collections">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:px-6">
        <section>
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Collections</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Manage public profile product categories and pieces.</p>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map(collection => (
            <article key={collection.id} className="rounded-xl border border-white/5 bg-[#17191F] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{collection.title}</h2>
                  <p className="mt-1 text-xs text-[#8c909f]">/{collection.slug}</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#c2c6d6]">{collection.Products.length} pieces</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {collection.Products.slice(0, 6).map(product => (
                  <img key={product.id} src={product.imageUrl} alt={product.name} className="aspect-square rounded-lg object-cover" />
                ))}
              </div>
              {collection.Products.length === 0 && <p className="mt-4 text-sm text-[#8c909f]">No active products in this collection yet.</p>}
            </article>
          ))}
        </section>
      </div>
    </OwnerFrame>
  );
}
```

---

## 12. Profile — /owner/profile

**File:** `app/owner/profile/page.tsx`

Shows a preview of the public storefront profile (cover image, avatar, services) alongside a scaffolded editor panel.

```tsx
"use client";

import Link from "next/link";
import OwnerFrame from "../OwnerFrame";

export default function OwnerProfilePage() {
  const account = MOCK_ACCOUNT;

  return (
    <OwnerFrame active="Profile">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 md:px-6">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Profile</h1>
            <p className="mt-2 text-[15px] text-[#c2c6d6]">Public storefront profile shown at your bio link.</p>
          </div>
          {account && <Link href={`/s/${account.slug}`} className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#c2c6d6] hover:bg-white/10">View public page</Link>}
        </section>

        <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Profile preview card */}
          <div className="overflow-hidden rounded-xl border border-white/5 bg-[#17191F]">
            <div className="h-36 bg-black">
              {account?.StoreProfile?.coverImageUrl ? <img src={account.StoreProfile.coverImageUrl} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="p-4">
              <div className="-mt-12 h-24 w-24 overflow-hidden rounded-2xl border-4 border-[#17191F] bg-[#272a31]">
                {account?.StoreProfile?.profileImageUrl ? <img src={account.StoreProfile.profileImageUrl} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <h2 className="mt-3 text-xl font-bold">{account?.StoreProfile?.displayName ?? account?.name ?? "Store profile"}</h2>
              <p className="mt-1 text-sm text-[#8c909f]">@{account?.StoreProfile?.instagramHandle ?? "instagram"}</p>
              <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">{account?.StoreProfile?.headline ?? "Add a tagline for your public profile."}</p>
            </div>
          </div>

          {/* Editor scaffold */}
          <div className="rounded-xl border border-white/5 bg-[#17191F] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7bc5f]">Profile editor</p>
            <h2 className="mt-3 text-2xl font-bold">Editing scaffold</h2>
            <p className="mt-2 text-sm leading-6 text-[#8c909f]">Next step is wiring forms for cover photo, profile image, WhatsApp number, services, and publish state.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {account?.StoreServices.map(service => (
                <div key={service.id} className="rounded-lg border border-white/5 bg-[#101114] px-3 py-2">
                  <p className="text-sm font-semibold">{service.title}</p>
                  <p className="text-xs text-[#8c909f]">{service.isActive ? "Visible" : "Hidden"}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </OwnerFrame>
  );
}
```

---

## 13. Reviews — /owner/reviews

**File:** `app/owner/reviews/page.tsx`

Scaffold placeholder page.

```tsx
"use client";

import OwnerFrame from "../OwnerFrame";

export default function OwnerReviewsPage() {
  return (
    <OwnerFrame active="Reviews">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 md:px-6">
        <section>
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Reviews</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Collect, review, and publish customer testimonials.</p>
        </section>
        <div className="rounded-xl border border-white/5 bg-[#17191F] p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7bc5f]">Scaffold</p>
          <h2 className="mt-3 text-2xl font-bold">Reviews are not wired yet.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8c909f]">This page will manage review requests, moderation, star ratings, and public profile display.</p>
        </div>
      </div>
    </OwnerFrame>
  );
}
```

---

## 14. Settings — /owner/settings

**File:** `app/owner/settings/page.tsx`

Wraps the PromptModeForm. Also mirrored at `/owner/account`.

```tsx
"use client";

import OwnerFrame from "../OwnerFrame";
import PromptModeForm from "../PromptModeForm";

export default function OwnerSettingsPage() {
  return (
    <OwnerFrame active="Settings">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 md:px-6">
        <section>
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Settings</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Account preferences, prompt mode, and operational controls.</p>
        </section>
        <PromptModeForm initialMode="json" />
      </div>
    </OwnerFrame>
  );
}
```

---

## 15. Account — /owner/account

**File:** `app/owner/account/page.tsx`

Identical structure to Settings, different heading copy.

```tsx
"use client";

import OwnerFrame from "../OwnerFrame";
import PromptModeForm from "../PromptModeForm";

export default function OwnerAccountPage() {
  return (
    <OwnerFrame active="Settings">
      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-8 px-4 md:px-6">
        <section className="min-w-0">
          <h1 className="mt-3 text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Account</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Manage owner-level settings for the admin panel.</p>
        </section>
        <PromptModeForm initialMode="json" />
      </div>
    </OwnerFrame>
  );
}
```

---

## 16. PromptModeForm

**File:** `app/owner/PromptModeForm.tsx`

Settings toggle for choosing between JSON prompts vs natural language prompts. PATCHes `/api/owner-settings`.

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

 type PromptMode = "json" | "natural_language";

 type Props = {
  initialMode: PromptMode;
};

const OPTIONS: Array<{ value: PromptMode; label: string; description: string }> = [
  {
    value: "json",
    label: "JSON prompts",
    description: "Use the structured prompt templates currently used by all name styles."
  },
  {
    value: "natural_language",
    label: "Natural language",
    description: "Use natural-language templates when a style supports them. Gatti is configured first."
  }
];

export default function PromptModeForm({ initialMode }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<PromptMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function updateMode(nextMode: PromptMode) {
    setMode(nextMode);
    setError(null);

    try {
      const response = await fetch("/api/owner-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptMode: nextMode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Unable to update prompt mode.");
      startTransition(() => router.refresh());
    } catch (err) {
      setMode(initialMode);
      setError(err instanceof Error ? err.message : "Unable to update prompt mode.");
    }
  }

  return (
    <section className="rounded-2xl border border-[#D1B873]/15 bg-[#17191F] p-4 shadow-[0_12px_34px_rgba(0,0,0,0.2)]">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#D1B873]">Prompt System</p>
        <h2 className="text-lg font-bold text-[#e1e2ec]">Name Pendant Prompt Mode</h2>
        <p className="text-sm text-[#8c909f]">Choose which prompt format new name generations use.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(option => {
          const active = mode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => void updateMode(option.value)}
              disabled={isPending || active}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[#D1B873]/60 bg-[#56450a]/45 text-[#dec47e]"
                  : "border-white/10 bg-black/25 text-[#e1e2ec] hover:border-white/25 hover:bg-white/[0.03]"
              }`}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-[#8c909f]">{option.description}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">
          {error}
        </div>
      )}
    </section>
  );
}
```

---

## 17. API Contracts

All `fetch()` calls used across the owner frontend:

### 17.1 Owner Authentication

```
POST /api/owner-auth
Body: { accessCode: string }
Response: { success: true } | { error: string }
```

### 17.2 Send Quote

```
PATCH /api/quote-requests/:quoteId
Body: {
  quotedPriceCents: number,
  quoteNotes: string,
  status: "sent"
}
Response: { success: true } | { error: string }
```

### 17.3 Start Video Generation

```
POST /api/owner/video-jobs
Body: { resultId: string }
Response: { videoJobId: string } | { error: string }
```

### 17.4 Poll Video Job Status

```
GET /api/owner/video-jobs/:id
Response: {
  id: string,
  sourceImageUrl: string,
  videoUrl: string | null,
  remoteVideoUrl: string | null,
  status: "pending" | "succeeded" | "failed",
  error: string | null,
  durationSeconds: number | null,
  done: boolean,
  request: {
    text: string,
    styleId: string,
    primaryMetal: string,
    secondaryMetal: string | null,
    emblem: string
  }
}
```

### 17.5 Update Settings

```
PATCH /api/owner-settings
Body: { promptMode: "json" | "natural_language" }
Response: { success: true } | { error: string }
```

---

## 18. Styling System Reference

### 18.1 Global CSS (`app/globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  min-height: 100vh;
  background: linear-gradient(180deg, var(--theme-gradient-top) 0%, var(--theme-gradient-mid) 48%, var(--theme-gradient-bottom) 100%);
  color: var(--theme-text);
  font-family: var(--font-figtree), system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
}

::selection {
  background: color-mix(in srgb, var(--theme-accent) 35%, transparent);
}
```

### 18.2 Tailwind Config (`tailwind.config.ts`)

```ts
import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brandA: "#A28547",
        brandB: "#89500F",
        brandC: "#4D300F",
        brandD: "#000000"
      },
      boxShadow: { soft: "0 10px 30px rgba(0,0,0,0.35)" }
    }
  },
  plugins: []
} satisfies Config;
```

### 18.3 Root Layout (`app/layout.tsx`)

```tsx
import "./globals.css";
import { Figtree } from "next/font/google";
import localFont from "next/font/local";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const nostalgic = localFont({
  src: "../public/fonts/perfectly-nostalgic-bold-italic.ttf",
  variable: "--font-nostalgic"
});

export const metadata = { title: "Pendant MVP", description: "Custom pendant ideation" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${nostalgic.variable}`}>
      <body className="min-h-dvh">
        {children}
      </body>
    </html>
  );
}
```

---

## 19. File Map

```
app/
├── owner/
│   ├── page.tsx                    → Dashboard (metrics, search, filters, QuoteCards)
│   ├── studio/
│   │   └── page.tsx                → Studio hub (drafts, video jobs, VVS Studio link)
│   ├── videos/
│   │   ├── page.tsx                → Videos grid list
│   │   ├── [videoJobId]/
│   │   │   └── page.tsx            → Video detail shell
│   │   └── VideoJobStatus.tsx      → Live polling video player
│   ├── collections/
│   │   └── page.tsx                → Collections grid
│   ├── profile/
│   │   └── page.tsx                → Public profile preview + editor scaffold
│   ├── reviews/
│   │   └── page.tsx                → Reviews placeholder
│   ├── settings/
│   │   └── page.tsx                → Settings (PromptModeForm)
│   ├── account/
│   │   └── page.tsx                → Account (PromptModeForm)
│   ├── OwnerFrame.tsx              → Layout shell (sidebar, header)
│   ├── OwnerLoginForm.tsx          → Access code login
│   ├── SendQuoteForm.tsx           → Quote modal (client)
│   ├── PromptModeForm.tsx          → Settings toggle (client)
│   ├── GenerateVideoButton.tsx     → Video gen trigger + confirm (client)
│   └── GenerationVideoCard.tsx     → Draft thumbnail + actions
│
├── globals.css                     → Tailwind directives + base styles
├── layout.tsx                      → Fonts + html wrapper
└── ThemeSwitcher.tsx               → (external) Theme toggle
```

**Excluded:** `vvs-studio/` folder entirely (wizard + 5 components + types).
