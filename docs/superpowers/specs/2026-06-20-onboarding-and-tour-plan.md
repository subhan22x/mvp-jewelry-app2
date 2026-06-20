# Onboarding & Guided Tour — Implementation Plan
_2026-06-20_

Reference spec: `docs/superpowers/specs/2026-06-20-onboarding-and-tour-design.md`

---

## Phase 0 — Assets (no code, do first)

**0.1** Copy fonts and images from the claude.ai design project into the repo:

- `public/fonts/TheShuffle-Regular.ttf` ← `onboarding/assets/TheShuffle-Regular.ttf`
- `public/onboarding/hero-ipad-display.png` ← `onboarding/assets/hero-ipad-display.png`
- `public/onboarding/app-screen-1.png` ← `onboarding/assets/app-screen-1.png`
- `public/onboarding/hero-jewelry.png` ← `onboarding/assets/hero-jewelry.png`
- `public/onboarding/vvs-design-logo.png` ← `onboarding/assets/vvs-design-logo.png`

Use `DesignSync get_file` to read each file and write to disk, or download directly.

**0.2** Register the font in `app/layout.tsx`:
```ts
const theShuffle = localFont({
  src: "../public/fonts/TheShuffle-Regular.ttf",
  variable: "--font-the-shuffle"
});
// add to <html className={...theShuffle.variable...}>
```

---

## Phase 1 — Slim onboarding API

**File:** `app/api/onboarding/route.ts`

Replace the current body schema and handler with a minimal version.

**1.1** New Zod schema:
```ts
const onboardingSchema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  instagramHandle: z.string().optional(),
});
```

**1.2** Auto-slug generation — replace the fixed slug field with:
```ts
async function uniqueSlug(base: string): Promise<string> {
  const s = slugify(base) || "store";
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? s : `${s}-${i + 1}`;
    const existing = await prisma.account.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  return `${s}-${Date.now()}`;
}
```

**1.3** Account creation transaction — wrap all creates in `prisma.$transaction([...])`:
- `account.create` with auto slug, `logoUrl` from upload, `themeKey: "classic_black_gold"`, `status: "active"`
- Nested `StoreProfile.create` with `isPublished: false`, `displayName: businessName`, `phone`, `instagramHandle`
- Nested `Memberships.create` → `user.create` with `authUserId`, `storeName: businessName`, `name: ownerName`, `phone`
- Nested `StoreServices.create` — only 2 services: `quote` (active) + `design_custom` (active)
- No ProductCollections created here (moved to lazy creation later)

**1.4** Response: `{ accountId, slug, ownerUrl: "/design?tour=1" }`

---

## Phase 2 — New onboarding page

**File:** `app/onboarding/page.tsx` — full replacement

**2.1** State shape:
```ts
const [screen, setScreen] = useState(0);   // 0–5
const [drag, setDrag] = useState(0);
const startX = useRef<number | null>(null);

// form fields
const [ownerName, setOwnerName] = useState("");
const [phone, setPhone] = useState("");
const [instagramHandle, setInstagramHandle] = useState("");
const [businessName, setBusinessName] = useState("");
const [logoFile, setLogoFile] = useState<File | undefined>();
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

// auth state
const [authChecked, setAuthChecked] = useState(false);
const [authedEmail, setAuthedEmail] = useState<string | null>(null);

// submission
const [isSubmitting, setIsSubmitting] = useState(false);
const [submitError, setSubmitError] = useState<string | null>(null);
```

**2.2** `localStorage` resume — on mount:
```ts
useEffect(() => {
  const saved = parseInt(localStorage.getItem("vvs_onb") ?? "0", 10);
  if (saved > 0 && saved < 6) setScreen(saved);
}, []);
useEffect(() => {
  localStorage.setItem("vvs_onb", String(screen));
}, [screen]);
```

**2.3** sessionStorage rehydration for OAuth return — on mount, after auth check:
```ts
const draft = sessionStorage.getItem("vvs_onb_draft");
if (draft) {
  const d = JSON.parse(draft);
  setOwnerName(d.ownerName ?? "");
  setPhone(d.phone ?? "");
  setInstagramHandle(d.instagramHandle ?? "");
  setBusinessName(d.businessName ?? "");
  setEmail(d.email ?? "");
  sessionStorage.removeItem("vvs_onb_draft");
  setScreen(5); // jump to final screen
}
```

**2.4** Swipe handlers — same pattern as the design JSX (onMouseDown/Move/Up + onTouchStart/Move/End), rubber-band at edges, 56px threshold to advance.

**2.5** Six screen components (as local functions or sub-components):

- `ScreenWelcome` — hero image + headline. Image: `/onboarding/hero-ipad-display.png`. Overlay gradient. Text: "Convert 2× more high paying customers — " + italic display font "using AI."
- `ScreenGetStarted` — FormHead "Get Started / First, the basics." Fields: ownerName, phone, instagramHandle (with @ prefix).
- `ScreenProblem` — Three FrictionCards with icons (Design / Pricing / Communication). No form fields.
- `ScreenFix` — Floating app screenshot (`/onboarding/app-screen-1.png`). Text: "We fix that — by letting your customers design it."
- `ScreenAccount` — FormHead "Create Account / Set up your studio." Fields: businessName, logo upload (64×64 circle preview), email, password, confirm password. Google OAuth button. `onGoogleClick` stashes draft to sessionStorage then calls `supabase.auth.signInWithOAuth({ provider: "google", redirectTo: "/auth/confirm?next=/onboarding" })`.
- `ScreenScope` — Hero image (`/onboarding/hero-jewelry.png`). Category pills: Pendants ✓, Bracelets ✓, Grillz ✓, Rings (soon), Chains (soon). CTA button: "Design a Pendant" triggers `handleSubmit`.

**2.6** `handleSubmit` (called by ScreenScope CTA):
```ts
async function handleSubmit() {
  setIsSubmitting(true);
  setSubmitError(null);
  try {
    const supabase = createClient();
    // 1. Sign up (no-op if already authed via Google)
    if (!authedEmail) {
      const { error } = await supabase.auth.signUp({ email, password,
        options: { emailRedirectTo: `${origin}/auth/confirm?next=/onboarding` }
      });
      if (error) throw error;
    }
    // 2. Upload logo
    let logoUpload: DirectUploadReference | null = null;
    if (logoFile) logoUpload = await uploadFileDirectly(logoFile, "onboarding");
    // 3. POST to API
    const body = { businessName, ownerName, phone, instagramHandle };
    const form = new FormData();
    form.set("payload", JSON.stringify(body));
    if (logoUpload) form.set("logoUpload", JSON.stringify(logoUpload));
    const res = await fetch("/api/onboarding", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "Failed to create account.");
    // 4. Clear onboarding state
    localStorage.removeItem("vvs_onb");
    // 5. Redirect into tour
    router.push(json.ownerUrl ?? "/design?tour=1");
  } catch (err) {
    setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    setIsSubmitting(false);
  }
}
```

**2.7** Top bar (absolutely positioned, z-30):
- Left: `<img src="/onboarding/vvs-design-logo.png" height=18 />`
- Right: "Skip" button → `setScreen(5)`, hidden when `screen === 5`

**2.8** Bottom nav (absolutely positioned, z-30):
- Progress dots: pill on active (width 26px), circle otherwise (7px)
- Back arrow button: hidden on screen 0
- Continue/CTA button: gold gradient, full width minus back button

**2.9** Ambient glow: `radial-gradient` from top center in warm amber — same as design JSX.

**2.10** Colours / CSS constants (inline or a small `ob` style object):
```
bg: #080503
panel: position:relative overflow:hidden width/height 100%
gold: #e8b06a
gold-deep: #d4924a
cream: #ede4d4
dim: rgba(237,228,212,0.62)
```

---

## Phase 3 — Tour engine

### 3.1 Step config

**New file:** `src/lib/tour/steps.ts`

```ts
export type TourStep = {
  index: number;
  route: string;           // pathname to match
  body: string;            // bubble text
  placement: "top" | "bottom" | "center";
  isLast?: boolean;
};

export const TOUR_STEPS: TourStep[] = [
  {
    index: 0,
    route: "/design",
    body: "This is what customers see first, when you scan a QR code or they go through your website",
    placement: "bottom",
  },
  {
    index: 1,
    route: "/pendants",
    body: "users can choose from multiple styles, or create their own (in pendants > custom)",
    placement: "top",
  },
  {
    index: 2,
    route: "/pendants",
    body: "including clarifying details to help you price the pendant later",
    placement: "top",
  },
  {
    index: 3,
    route: "/pendants",
    body: "We collect Customer information to help you reach out and market to interested leads!",
    placement: "top",
  },
  {
    index: 4,
    route: "/owner",
    body: "once the customer is done, the quote request is sent to you — you respond to it through the admin panel",
    placement: "center",
    isLast: true,
  },
];

export const TOUR_STORAGE_KEY = "vvs_tour_step";
```

### 3.2 TourBubble component

**New file:** `app/components/TourBubble.tsx`

```tsx
"use client";
type Props = {
  body: string;
  placement: "top" | "bottom" | "center";
  isLast?: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  stepIndex: number;
  totalSteps: number;
};
```

Renders:
- Full-screen dim backdrop: `position:fixed inset-0 bg-black/50 z-[9998]`
- Bubble container: `position:fixed z-[9999]` with placement:
  - `top`: `top: 80px; left: 50%; transform: translateX(-50%)`
  - `bottom`: `bottom: 120px; left: 50%; transform: translateX(-50%)`
  - `center`: `top: 50%; left: 50%; transform: translate(-50%,-50%)`
- Bubble: `background: #2196F3; color: white; border-radius: 18px; padding: 20px 24px; max-width: 280px; font-size: 20px; font-weight: 700; box-shadow: 0 8px 24px rgba(0,0,0,0.3)`
- Tail: CSS `::before` triangle, pointing down for `bottom`, up for `top`, none for `center`
- Controls row below bubble:
  - Back text button (grey, hidden on step 0)
  - For non-last: "Next →" white pill button
  - For last: "Go to dashboard →" white pill button
  - "Skip tour" small link (hidden on last)

### 3.3 GuidedTour component

**New file:** `app/components/GuidedTour.tsx`

```tsx
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TOUR_STEPS, TOUR_STORAGE_KEY } from "@/src/lib/tour/steps";
import TourBubble from "./TourBubble";

export default function GuidedTour() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState<number | "done" | null>(null);

  // Bootstrap: ?tour=1 starts the tour
  useEffect(() => {
    if (searchParams.get("tour") === "1") {
      localStorage.setItem(TOUR_STORAGE_KEY, "0");
      // remove ?tour=1 from URL without re-render loop
      router.replace(pathname);
    }
  }, [searchParams, pathname, router]);

  // Read step from storage on every pathname change
  useEffect(() => {
    const raw = localStorage.getItem(TOUR_STORAGE_KEY);
    if (raw === null) { setStepIndex(null); return; }
    if (raw === "done") { setStepIndex("done"); return; }
    const n = parseInt(raw, 10);
    setStepIndex(Number.isFinite(n) ? n : null);
  }, [pathname]);

  if (stepIndex === null || stepIndex === "done") return null;

  const step = TOUR_STEPS[stepIndex];
  if (!step) return null;

  // Only render if we're on the right route
  // For /pendants steps (1,2,3) match all /pendants sub-paths
  const routeMatch = pathname === step.route || pathname.startsWith(step.route + "/");
  if (!routeMatch) return null;

  function advance() {
    const next = (stepIndex as number) + 1;
    if (next >= TOUR_STEPS.length) {
      localStorage.setItem(TOUR_STORAGE_KEY, "done");
      setStepIndex("done");
      return;
    }
    const nextStep = TOUR_STEPS[next];
    localStorage.setItem(TOUR_STORAGE_KEY, String(next));
    setStepIndex(next);
    if (nextStep.route !== step!.route) {
      router.push(nextStep.route);
    }
  }

  function back() {
    const prev = Math.max(0, (stepIndex as number) - 1);
    const prevStep = TOUR_STEPS[prev];
    localStorage.setItem(TOUR_STORAGE_KEY, String(prev));
    setStepIndex(prev);
    if (prevStep.route !== step!.route) {
      router.push(prevStep.route);
    }
  }

  function skip() {
    localStorage.setItem(TOUR_STORAGE_KEY, "done");
    setStepIndex("done");
  }

  function finish() {
    localStorage.setItem(TOUR_STORAGE_KEY, "done");
    setStepIndex("done");
    router.push("/owner");
  }

  return (
    <TourBubble
      body={step.body}
      placement={step.placement}
      isLast={step.isLast}
      onNext={step.isLast ? finish : advance}
      onBack={back}
      onSkip={skip}
      stepIndex={stepIndex as number}
      totalSteps={TOUR_STEPS.length}
    />
  );
}
```

### 3.4 Mount in root layout

**File:** `app/layout.tsx`

Wrap `<GuidedTour>` in a `<Suspense>` (required because it uses `useSearchParams`):

```tsx
import { Suspense } from "react";
import GuidedTour from "./components/GuidedTour";

// inside <body>:
<Suspense>
  <GuidedTour />
</Suspense>
```

### 3.5 Tour interaction with NameBuilder (steps 1–3)

Steps 1, 2, 3 all route to `/pendants`. The tour needs NameBuilder to show different internal states:

- **Step 1 (index 1):** NameBuilder starts at internal `step 0` (text + style picker) by default — no change needed, the tour bubble appears at top.
- **Step 2 (index 2):** Tapping Next on the tour bubble advances the tour step to index 2 and NameBuilder internal step to 1. Implement via `tourStep` prop on `NameBuilder` that `useEffect`s to call `setStep(1)` when `tourStep >= 2`. Pass `tourStep` from `GuidedTour` via a context (`TourContext`).
- **Step 3 (index 3):** Tapping Next advances tour to index 3 and calls `setShowLeadCapture(true)`. NameBuilder reads `tourStep` from context; `useEffect` sets `showLeadCapture(true)` when `tourStep === 3`.

**New file:** `app/components/TourContext.tsx`
```tsx
"use client";
import { createContext, useContext } from "react";
export const TourContext = createContext<{ tourStep: number | null }>({ tourStep: null });
export const useTourStep = () => useContext(TourContext).tourStep;
```

`GuidedTour.tsx` wraps children via context provider. Since it's mounted in layout, it needs to provide context. Provide `TourContext.Provider` around `{children}` in layout, or simply export `tourStep` from a global Zustand/atom — but since we want to avoid new dependencies, use a simple window event: `GuidedTour` dispatches `CustomEvent("vvs-tour-step", { detail: stepIndex })` whenever step changes, and `NameBuilder` listens with `addEventListener`.

Actually simpler: `GuidedTour` stores step in localStorage (already does) and `NameBuilder` reads it on mount and on a `storage` event. No cross-component coupling needed.

```ts
// in NameBuilder, on mount:
useEffect(() => {
  const raw = localStorage.getItem("vvs_tour_step");
  const n = raw ? parseInt(raw, 10) : null;
  if (n === 2) setStep(1);        // show customize step
  if (n === 3) { setStep(1); setShowLeadCapture(true); }

  const onStorage = (e: StorageEvent) => {
    if (e.key !== "vvs_tour_step") return;
    const v = e.newValue ? parseInt(e.newValue, 10) : null;
    if (v === 2) setStep(1);
    if (v === 3) { setStep(1); setShowLeadCapture(true); }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}, []);
```

---

## Phase 4 — Verification

**4.1** Run the app (`pnpm dev`) and walk through the onboarding end-to-end:
- Swipe all 6 screens
- Check rubber-banding at edges
- Check logo upload preview
- Submit with email/password (watch Network tab: 1 supabase signUp + 1 POST /api/onboarding)
- Confirm redirect to `/design?tour=1`

**4.2** Walk through the tour:
- Step 1 bubble appears on `/design` at bottom
- Next → `/pendants`, step 2 bubble at top, NameBuilder at style picker
- Next → step 3 bubble at top, NameBuilder advances to emblem/color/size step
- Next → step 4 bubble at top, LeadCapture modal opens
- Next → `/owner`, step 5 bubble at center
- "Go to dashboard →" dismisses tour, stays on `/owner`
- Skip at any step dismisses tour

**4.3** Reload mid-tour: confirm resume works (localStorage persists)

**4.4** Test Google OAuth path: fill screen 2–5 fields, click Google → redirect → return → fields rehydrated → screen 6 visible

---

## File change summary

| File | Action |
|------|--------|
| `app/onboarding/page.tsx` | Full replacement |
| `app/api/onboarding/route.ts` | Slim schema, auto-slug, transaction, `isPublished:false` |
| `app/layout.tsx` | Add TheShuffle font + `<GuidedTour>` in Suspense |
| `app/components/GuidedTour.tsx` | New |
| `app/components/TourBubble.tsx` | New |
| `src/lib/tour/steps.ts` | New |
| `app/name/NameBuilder.tsx` | Add localStorage-based tour step listener |
| `public/fonts/TheShuffle-Regular.ttf` | New (copy from design project) |
| `public/onboarding/*.png` | New (4 images from design project) |

No schema migration required. No new DB models.
