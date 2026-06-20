# Onboarding Revamp — Agent Handoff Brief
_Written 2026-06-20. Self-contained. No prior conversation context needed._

---

## What you are building

Replace the existing multi-step onboarding form at `app/onboarding/page.tsx` with a swipeable marketing carousel (Part A), then build a 5-step guided tour overlay that plays after onboarding and walks the new store-owner through the customer-facing design tool ending at the admin panel (Part B).

The full spec and implementation plan are already written. **Read these two files first, in order:**

1. `docs/superpowers/specs/2026-06-20-onboarding-and-tour-design.md` — design decisions, screen list, tour steps, bubble copy, data model decisions
2. `docs/superpowers/specs/2026-06-20-onboarding-and-tour-plan.md` — exact file-by-file implementation steps with code snippets, phase by phase

Do not deviate from those documents without a reason. Everything below is supplementary context to help you interpret them correctly.

---

## Source designs

### Onboarding carousel design (Part A)
**Claude Design project:**
```
https://claude.ai/design/p/59589b38-2cc9-4ed2-bcee-c5c5c47a2637?file=onboarding%2FVVS+Design+-+Onboarding.html
```

The implementation source is the JSX component at `onboarding/onboarding-app.jsx` inside that project. Read it via the `DesignSync` MCP tool:
```
method: get_file
projectId: 59589b38-2cc9-4ed2-bcee-c5c5c47a2637
path: onboarding/onboarding-app.jsx
```

This JSX file contains the full carousel shell, all 6 screen components, swipe/drag logic, progress dots, top bar, bottom nav, ambient glow, and colour constants. Port it to a Next.js `"use client"` page. The JSX uses React without imports (standalone); adapt imports for Next.js.

Assets you need to pull from the same design project (`onboarding/assets/`):
- `TheShuffle-Regular.ttf` → `public/fonts/TheShuffle-Regular.ttf`
- `hero-ipad-display.png` → `public/onboarding/hero-ipad-display.png`
- `app-screen-1.png` → `public/onboarding/app-screen-1.png`
- `hero-jewelry.png` → `public/onboarding/hero-jewelry.png`
- `vvs-design-logo.png` → `public/onboarding/vvs-design-logo.png`

Use `DesignSync get_file` with `projectId: 59589b38-2cc9-4ed2-bcee-c5c5c47a2637` to read each file as base64 and write to disk.

### Guided tour design (Part B)
**Figma file:**
```
https://www.figma.com/design/tRK6MUt9OLIeAX82qlBq5K/Untitled?node-id=68-4
```

The Figma file cannot be read programmatically (requires an authenticated Figma session). The tour content has already been fully extracted from the design screenshots and is captured in the spec doc and in the tour step config below. Do not attempt to fetch the Figma URL — use the copy already in the spec.

---

## Key decisions made by the owner (do not re-litigate)

| Decision | What was chosen | Why |
|----------|----------------|-----|
| Slug during onboarding? | Auto-generated from business name via `slugify()` + uniqueness suffix `-2`, `-3`… No slug picker shown to user | De-emphasise the public store page; keep onboarding fast |
| Public store page on sign-up? | `isPublished: false` on StoreProfile creation | New direction is design-tool-first; public page is secondary |
| When does Account get created? | Single POST on the final "Design a Pendant" CTA. All fields held client-side until then | Simpler than mid-flow partial saves |
| Google OAuth + single-submit? | Stash all collected fields to `sessionStorage("vvs_onb_draft")` before OAuth redirect; rehydrate on redirect-back to `/onboarding`; resume at screen 6 | Preserves single-submit contract through OAuth round-trip |
| What the onboarding API creates | Account + User + AccountMembership + StoreProfile + 2 StoreServices (quote + design_custom active). No ProductCollections, no theme picker, no cover image, no slug field | Minimal viable account; owner fills in the rest via profile editor later |
| Tour entry point | `/design?tour=1` — the category picker page | This is what customers see first |
| Tour ends at | `/owner` with "Go to dashboard →" button | Owner lands where they'll actually work |
| Tour state storage | `localStorage` key `vvs_tour_step` (integer 0–4, or `"done"`) | Simple; no DB migration required |
| Tour–NameBuilder coupling | NameBuilder listens to `window` `storage` events on `vvs_tour_step`; advances its own internal step when tour step changes | No new React context or state library needed |

---

## Existing codebase — what to know before touching things

### Auth
- Supabase auth via `src/lib/supabase/client.ts` (client) and `src/lib/supabase/server.ts` (server)
- `createClient()` from the client module is used in client components
- The onboarding API route reads `supabase.auth.getUser()` server-side to get `authUserId`

### Onboarding API
- `app/api/onboarding/route.ts` — current file handles the old 6-step form
- You are replacing the Zod schema and handler. Keep the `uploadFileDirectly` / `parseDirectUploadReference` / `savePublicUpload` imports — they are still used for the logo upload
- The `slugify` helper is at `src/lib/slug.ts`
- The auto-slug uniqueness function is described in the plan (Phase 1.2)

### Data model (Prisma)
- `Account` requires a unique `slug` — this is what the auto-slug function generates
- `StoreProfile` has `isPublished: Boolean @default(false)` — set it to `false` on creation
- `AccountMembership` links User → Account with `role: "owner"`
- The `User` model has `authUserId String? @unique` — populate it from Supabase `data.user.id`
- Schema file: `prisma/schema.prisma`

### App layout
- `app/layout.tsx` uses Figtree (Google font) and a local `perfectly-nostalgic-bold-italic.ttf`
- You must add TheShuffle as a third `localFont` with CSS variable `--font-the-shuffle`
- The `<GuidedTour>` component must be mounted here inside a `<Suspense>` boundary (required because it calls `useSearchParams`)

### Design tool surfaces the tour overlays
The tour walks across these real pages in order:

1. `app/design/page.tsx` → renders `<DesignEntry>` (category picker grid: Pendant, Ring, Bracelet, Watches)
2. `app/pendants/page.tsx` → renders `<NameBuilder mode="icedout">` (internal step 0 = text input + style picker)
3. Same NameBuilder, internal step 1 = emblem picker + colour combo + size
4. Same NameBuilder, `showLeadCapture === true` triggers `<LeadCaptureModal>` overlay
5. `app/owner/page.tsx` → the admin quote list/detail panel

### NameBuilder internal steps
`NameBuilder` in `app/name/NameBuilder.tsx` uses a `step: Step` state (0–5). For the tour:
- Tour step 2 (index 2) needs NameBuilder at internal `step 1` (emblem/colour/size screen)
- Tour step 3 (index 3) needs NameBuilder at internal `step 1` with `showLeadCapture: true`

Wire this via a `window.addEventListener("storage", ...)` listener inside a `useEffect` in NameBuilder. When `localStorage.getItem("vvs_tour_step")` is `"2"`, call `setStep(1)`. When it is `"3"`, call `setStep(1)` and `setShowLeadCapture(true)`. The `storage` event fires cross-tab; for same-tab triggering, dispatch a synthetic event or read localStorage immediately after `GuidedTour` writes it.

---

## Tour bubble copy (exact, from Figma screenshots)

```ts
export const TOUR_STEPS = [
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
```

---

## Bubble visual spec (from Figma screenshots)

The bubble is an iMessage-style floating speech bubble:
- Background: `#2196F3` (blue)
- Text: white, ~20–22px, bold, line-height 1.4, `max-width: 280px`
- Padding: `20px 24px`
- Border-radius: `18px`
- Drop shadow: `0 8px 24px rgba(0,0,0,0.3)`
- Tail: CSS triangle pointing toward the content it annotates
  - `placement: "bottom"` → tail points down-left (bubble sits above content)
  - `placement: "top"` → tail points up-left (bubble sits below the top)
  - `placement: "center"` → no tail
- Backdrop: `position:fixed inset-0 bg-black/50 z-[9998]` (dims the page)
- Bubble container: `position:fixed z-[9999]`
  - `top` → `top: 80px; left: 50%; transform: translateX(-50%)`
  - `bottom` → `bottom: 120px; left: 50%; transform: translateX(-50%)`
  - `center` → `top: 50%; left: 50%; transform: translate(-50%, -50%)`
- Controls below the bubble:
  - "← Back" grey text button (hidden on step 0)
  - "Next →" white pill button (or "Go to dashboard →" on last step)
  - "Skip tour" small muted link (hidden on last step)

---

## Onboarding colour palette

All hardcoded — these are not theme variables; the onboarding has its own standalone dark skin:

```
screen bg:     #080503
panel bg:      same as screen bg (transparent relative)
gold:          #e8b06a
gold-deep:     #d4924a
cream:         #ede4d4
dim:           rgba(237,228,212,0.62)
border:        rgba(237,228,212,0.09) / rgba(237,228,212,0.16)
input bg:      rgba(237,228,212,0.04)
input border:  rgba(237,228,212,0.28) dashed (logo upload)
```

Ambient top glow: `radial-gradient(120% 70% at 50% -8%, rgba(192,138,66,0.5) 0%, rgba(120,74,40,0.18) 30%, rgba(20,12,6,0) 62%)`

---

## Files to create / modify — complete list

| File | Action |
|------|--------|
| `app/onboarding/page.tsx` | Full replacement — new carousel |
| `app/api/onboarding/route.ts` | Replace schema + handler (slim body, auto-slug, transaction) |
| `app/layout.tsx` | Add TheShuffle font variable + `<GuidedTour>` in `<Suspense>` |
| `app/components/GuidedTour.tsx` | New — tour engine |
| `app/components/TourBubble.tsx` | New — bubble UI |
| `src/lib/tour/steps.ts` | New — step config |
| `app/name/NameBuilder.tsx` | Add storage event listener for tour step sync |
| `public/fonts/TheShuffle-Regular.ttf` | New — copy from design project |
| `public/onboarding/hero-ipad-display.png` | New — copy from design project |
| `public/onboarding/app-screen-1.png` | New — copy from design project |
| `public/onboarding/hero-jewelry.png` | New — copy from design project |
| `public/onboarding/vvs-design-logo.png` | New — copy from design project |

**No Prisma schema migration needed.** `StoreProfile.isPublished` already exists and defaults to `false`.

---

## Things NOT to do

- Do not add a slug picker to the onboarding UI
- Do not add theme picker, cover image/gradient, services toggles, or starter product steps
- Do not set `isPublished: true` on StoreProfile during onboarding
- Do not create ProductCollections during onboarding (the old API did; remove it)
- Do not put the tour bubble copy inside the bubble component — keep it in `src/lib/tour/steps.ts`
- Do not use a spotlight/cutout effect — the design uses a simple dim backdrop only
- Do not add new npm dependencies for the tour (no tour libraries, no Zustand, no new context providers)
- Do not attempt to fetch the Figma URL programmatically — it requires an authenticated browser session

---

## How to verify it works

1. **Onboarding carousel:** Run `pnpm dev`. Go to `/onboarding`. Swipe all 6 screens. Check rubber-banding at first/last screen. Fill in screen 2 (Get Started) and screen 5 (Create Account). Tap "Design a Pendant". Check Network tab: should see one `supabase.auth.signUp` call and one `POST /api/onboarding`. Should redirect to `/design?tour=1`.

2. **Tour step 1:** After redirect, `/design` page loads. Blue bubble appears at bottom: "This is what customers see first…". Tap Next.

3. **Tour steps 2–4:** Navigates to `/pendants`. NameBuilder loads at step 0. Bubble at top: "users can choose from multiple styles…". Tap Next → NameBuilder advances to step 1 (emblem/colour/size). Bubble: "including clarifying details…". Tap Next → LeadCapture modal appears. Bubble: "We collect Customer information…". Tap Next.

4. **Tour step 5:** Navigates to `/owner`. Bubble at centre: "once the customer is done…". Tap "Go to dashboard →" → bubble dismisses, stays on `/owner`. `localStorage.getItem("vvs_tour_step")` should return `"done"`.

5. **Resume on reload:** Start tour, reload mid-step. Tour should resume at same step on correct route.

6. **Google OAuth path:** Fill screens 2–5, tap "Sign up with Google". All fields should be stashed in `sessionStorage("vvs_onb_draft")`. After OAuth completes and redirects back to `/onboarding`, fields should rehydrate and screen should be 5 (final scope screen).
