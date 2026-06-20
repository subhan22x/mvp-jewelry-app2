# Onboarding & Guided Tour — Design Spec
_2026-06-20_

## Overview

Replace the current 6-step form-heavy onboarding with a swipeable marketing carousel that mirrors the Claude Design mockup, followed by a 5-step guided tour that walks a new store-owner through the customer-facing design tool and the admin panel.

---

## Part A — New Onboarding Carousel

### What changes

`app/onboarding/page.tsx` is scrapped and replaced wholesale. The new flow is a horizontal swipe carousel with 6 screens, a sticky top bar (logo + Skip), progress dots, and a Back/Continue footer. All auth, form state, and the business logo upload are held client-side; a single POST fires only when the owner taps the final CTA.

### Screens

| # | Name | What it shows | Fields collected |
|---|------|---------------|-----------------|
| 1 | Welcome | Hero image (`hero-ipad-display.png`), tagline "Convert 2× more high paying customers — using AI" | — |
| 2 | Get Started | Form | `ownerName`, `phone`, `instagramHandle` |
| 3 | The Problem | Three friction cards: Design / Pricing / Communication | — |
| 4 | The Fix | App screen mockup, "We fix that — by letting your customers design it." | — |
| 5 | Create Account | Business name, logo upload, email, password/confirm, "Sign up with Google" | `businessName`, `logoFile`, `email`, `password` |
| 6 | What They Can Make | Category pill chips (Pendants ✓, Bracelets ✓, Grillz ✓, Rings soon, Chains soon). CTA: **"Design a Pendant"** | — |

### Typography / assets

- Display font: `TheShuffle-Regular.ttf` (from design project `onboarding/assets/`) → copy to `public/fonts/TheShuffle-Regular.ttf`
- Headline font: Figtree (already in layout)
- Images: `hero-ipad-display.png`, `app-screen-1.png`, `hero-jewelry.png`, `vvs-design-logo.png` → copy to `public/onboarding/`

### Interaction model

- Horizontal swipe / mouse drag with rubber-banding at first/last screen
- `localStorage` key `vvs_onb` persists current screen index so reload resumes
- Top bar: logo left, "Skip" right (hidden on final screen)
- Bottom: pill-dots progress indicator, round back-arrow button, wide gold Continue/CTA button
- Form screens stop swipe propagation so inputs don't accidentally swipe

### Google OAuth mid-flow

When "Sign up with Google" is tapped on screen 5, all collected fields are serialised to `sessionStorage` key `vvs_onb_draft` before the OAuth redirect. After Supabase redirects back to `/auth/confirm?next=/onboarding`, the page rehydrates those fields and advances straight to screen 6, so the single-submit contract is preserved.

### On final CTA ("Design a Pendant")

Executes sequentially:

1. **Create Supabase auth user** — `supabase.auth.signUp({ email, password })` (or skip if already authed via Google)
2. **Upload logo** — `uploadFileDirectly(logoFile, "onboarding")` if a logo was chosen
3. **POST `/api/onboarding`** with a slimmed body:
   ```ts
   {
     businessName,      // → Account.name + User.storeName
     ownerName,         // → User.name
     phone,             // → User.phone + StoreProfile.phone
     instagramHandle,   // → StoreProfile.instagramHandle
     logoUpload?,       // → Account.logoUrl + StoreProfile.profileImageUrl
   }
   ```
4. **API creates** (in one Prisma transaction):
   - `Account` with auto-generated slug (`slugify(businessName)`, uniqueness ensured by suffix `-2`, `-3`… via retry loop)
   - `User` linked to Supabase `authUserId`
   - `AccountMembership` (role: owner)
   - `StoreProfile` (`isPublished: false` — public page is de-emphasised)
   - Default `StoreServices` (quote + design_custom active; others inactive)
5. **Redirect** to `/design?tour=1`

### What the onboarding API no longer collects

Dropped entirely: slug picker, theme picker, cover image/gradient, services toggles, tagline, city/country/year, starter products. These remain available in the owner profile editor post-onboarding.

---

## Part B — Guided Tour Overlay

### Concept

A lightweight per-route overlay — a dimmed backdrop plus a floating iMessage-style blue bubble — that teaches the owner what their customer experiences and where quotes land. State survives page navigations via `localStorage`. The tour is triggered by `?tour=1` on any tour-aware route and advances with Back/Next/Skip controls.

### Tour steps

| Step | Route | Bubble text | Bubble placement |
|------|-------|-------------|-----------------|
| 1 | `/design` | "This is what customers see first, when you scan a QR code or they go through your website" | bottom |
| 2 | `/pendants` (NameBuilder step 0 — style picker) | "users can choose from multiple styles, or create their own (in pendants > custom)" | top |
| 3 | `/pendants` (NameBuilder step 1 — emblem/color/size) | "including clarifying details to help you price the pendant later" | top |
| 4 | `/pendants` (LeadCaptureModal visible) | "We collect Customer information to help you reach out and market to interested leads!" | top |
| 5 | `/owner` | "once the customer is done, the quote request is sent to you — you respond to it through the admin panel" | center |

Step 5 ends with a **"Go to dashboard →"** button instead of Next. Clicking it dismisses the tour and stays on `/owner`.

### Bubble design

Matches the Figma screenshots exactly:
- Background: `#2196F3` (iMessage blue)
- Text: white, 20–22px, bold, max-width ~280px
- Border-radius: 18px with a left-pointing tail (CSS triangle on bottom-left for bottom placement, top-left for top placement)
- Shadow: `0 8px 24px rgba(0,0,0,0.3)`
- Controls row below bubble: grey "Back" text button left, white pill "Next →" button right, small "Skip tour" link far right

### Tour engine

A single `<GuidedTour>` client component lives in `app/components/GuidedTour.tsx`. It:

1. Reads current step from `localStorage` key `vvs_tour_step`
2. Checks if the current `pathname` matches the active step's route
3. If it matches: renders the backdrop + bubble
4. If it doesn't match (different page): renders nothing (waits for the right route)

Navigation across steps that require a route change uses `router.push(nextStep.route)` then increments the step in storage so the new page picks it up on mount.

### Tour trigger & persistence

- Started by `?tour=1` search param — any tour-aware page detects this, sets step 0 in localStorage, removes the param from the URL
- Step progress in `localStorage` key `vvs_tour_step` (integer 0–4, or `"done"`)
- `"done"` value = tour never shown again for this browser session
- Future: persist `tourCompletedAt` to `StoreProfile` via PATCH so it doesn't re-trigger on new devices

### NameBuilder tour integration

Steps 2–4 require the NameBuilder to be at specific sub-steps (step 0, step 1, and LeadCapture visible). The tour engine passes the active tour step as a prop/context. When tour step is 2, NameBuilder auto-advances to its internal step 0 (it starts there by default — no change). When tour step is 3, the tour's "Next" button advances NameBuilder to internal step 1 AND increments the tour step. When tour step is 4, the tour triggers `setShowLeadCapture(true)` on NameBuilder via a shared context.

Actually — simpler approach: the tour overlay's "Next" on step 2 just navigates state and the tour bubble is positioned at the top with no actual interaction required from the user on the sub-steps — the owner taps Next on the tour bubble, not on the NameBuilder controls. The NameBuilder is visible but non-interactive during the tour (overlay dims it). Tour step 4 shows the LeadCapture modal by reading a flag from the tour context.

### Files created/modified

**New files:**
- `app/components/GuidedTour.tsx` — tour engine + bubble renderer
- `app/components/TourBubble.tsx` — the styled blue bubble + controls
- `src/lib/tour/steps.ts` — step config array (single source of truth for copy + routes + placement)

**Modified files:**
- `app/onboarding/page.tsx` — full replacement with carousel
- `app/api/onboarding/route.ts` — slim body schema, auto-slug, transaction, `isPublished: false`
- `app/layout.tsx` — mount `<GuidedTour>` in root layout (reads tour state, renders conditionally)
- `app/design/DesignEntry.tsx` — add `data-tour-id="design-entry"` for potential future anchor use
- `app/name/NameBuilder.tsx` — accept `tourStep` prop, expose context for step 4 LeadCapture trigger
- `app/owner/page.tsx` — no change needed; tour renders on top via layout

---

## Non-goals / out of scope

- Slug picker during onboarding (auto-generated; owner can change in profile settings later)
- Theme picker during onboarding
- Spotlight/cutout effect on anchored elements
- Tour persistence to DB (localStorage only for now; DB flag is a follow-up)
- The `/s/[accountSlug]` public store page being launch-ready from onboarding day-one

---

## Open questions resolved

| Question | Decision |
|----------|----------|
| Slug during onboarding? | Auto-generated from business name, no user input |
| Public store page emphasis? | De-emphasised; `isPublished: false` on creation |
| When is Account created? | Single POST on final CTA tap |
| Google OAuth + single-submit? | sessionStorage stash → rehydrate on redirect-back |
| Tour entry point? | `/design` (category picker) |
| Tour ends where? | `/owner`, with "Go to dashboard" button |
