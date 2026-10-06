Reviewer: OpenCode CLI, `opencode-go/deepseek-v4.1-flash`. Independent read-only session; completed successfully. Raw report follows. Findings are reviewer claims and require triage; see the consolidated assessment.

# Adversarial review — static thumbnail pipeline plan

Scope: read-only inspection of the repo as it exists today (Next 15.5.27, `sharp` already present, `images.unoptimized=true`). Findings are grounded in source I read; hypotheses are labeled. I did **not** run builds/tests and could not measure byte sizes (no execute tool) — see “Not checked” at the end.

## Highest-value findings

### 1. P1 — The plan optimizes pickers but leaves the *same source images* rendered raw, at larger sizes, in the same flows; the acceptance test cannot detect this

**Plan section:** Outcome/scope (“Every repository-owned thumbnail …”), Step 3 (“migrate independent pickers/category cards and static review thumbnails”), Acceptance (“no thumbnail requests reach `/_next/image`”).

**Failure scenario:** The picker tiles get WebP, but each flow also renders the selected style from the *same original* with a plain `<img>` (large preview). The biggest bytes still ship, yet the acceptance check passes because neither plain `<img>` nor `next/image` under `unoptimized` produces/routes through optimizer output. “Grillz picker downloads 10.9 MiB” is only half the problem; `GrillzBuilder` renders the selected style again.

**Evidence (verified):**
- `app/grillz/GrillzBuilder.tsx:239` picker uses `next/image src={style.src}`; `:464` selected-style panel uses raw `<img src={stylePreviewUrl}>` from the same style image.
- `app/bracelets/icedout/IcedoutBraceletBuilder.tsx:271` (`ThemedImageOption`) vs `:338` raw `<img src={selectedStyle.src}>`.
- `app/bracelets/womens/WomensBraceletBuilder.tsx:166` vs `:210` raw `<img src={selectedStyle.src}>`.
- `app/picture-pendants/PicturePendantsBuilder.tsx:307` picker vs `:512` raw preview `<img>`.
- Necklace size guides are customer-facing and untouched: `app/necklaces/NecklacesBuilder.tsx:23-27` (`chain-18/20/22/30.png`), rendered `:374`; plan’s inventory never mentions them.
- `next.config.mjs:3` sets `images.unoptimized=true`, so the “no `/_next/image`” assertion proves nothing about optimization.

**Correction:** The inventory must be “every repo-owned UI render of each source” (picker **+ selected preview + instructional/guide**), each mapped to one `assetId`. Acceptance must assert **cold-load transfer bytes** for each flow (e.g., via Playwright `page.on('response')`), not route names.

**Acceptance test:** Cold-load `/grillz`, `/bracelets/icedout`, `/bracelets/womens`, `/name`, `/necklaces/slim_cuban`; assert every repo-owned image response under those routes is `.webp` (or an intentional SVG/passthrough) and total image bytes < baseline.

---

### 2. P1 — A gitignored generated manifest imported by app code breaks a clean checkout before the generator runs (`npm test`, `tsc`, `next dev`)

**Plan section:** Step 2 (“Ignore generated derivatives, manifest, temporary files, and local cache in Git”); Dev launcher (“generates the initial manifest before starting Next”).

**Failure scenario:** `StaticThumbnail` imports `manifest.generated.json` at module scope. On a fresh clone (or CI job that runs only `npm test`), the file is absent → module resolution error before any test logic runs. `predev` does not help `vitest`, and there is no `pretest`.

**Evidence (verified):**
- `.gitignore:17-18` only ignores `public/generated/*`; the plan would add the manifest.
- Tests import the builders directly, so the manifest enters the test graph: `app/name/__tests__/nameBuilder.test.tsx:5`, `app/picture-pendants/__tests__/picturePendants.test.tsx:5`, `app/pendants/logo/__tests__/flow.test.tsx:4`.
- `package.json:11` (`test`) has no `pretest`; `build` (`:7`) has no generation step yet.

**Correction:** Commit the **manifest** (it’s small metadata) and gitignore only the image derivatives; generate derivatives in `predev`/`prebuild`, and add `thumbnails:check` to CI to fail on manifest drift. A committed manifest also makes finding 6’s drift visible.

**Acceptance test:** `git clone && npm ci && npm test && npx tsc --noEmit` pass with **no generator run**.

---

### 3. P2 — A flat `assetId` namespace collides; a collision already exists between the two necklace configs

**Plan section:** Asset contract (“stable ID”), “Reject duplicate IDs,” Step 3 (“The shared option component will accept the registered asset ID”).

**Failure scenario:** IDs are currently local to each dataset (`slim_cuban`, `style_1`, `crown`, `king`). A single namespace either throws (plan says reject duplicates) or silently picks one, rendering the wrong art. This is not hypothetical: the repo has **two** `NECKLACE_STYLES` arrays keyed by the same IDs.

**Evidence (verified):**
- `app/necklaces/necklace-options.ts:12-21` and `src/lib/necklaces/config.ts:35-99` both export `NECKLACE_STYLES` containing `slim_cuban`, `cuban`, `figaro`, etc.
- Other unnamespaced example IDs: `data/pendant-styles.json:42` (`king`), `lib/assets.ts:44-48` (`crown`), IcedoutBraceletBuilder `style_1`, NameBuilder `plain_style_1`.

**Correction:** Namespace IDs by domain+role: `necklace.slim_cuban.thumbnail`, `necklace.slim_cuban.reference`, `pendant.king.thumbnail`, `emblem.crown`, `bracelet.icedout.style_1`, `logo-shape.circle`, `category.grillz`. Derive, don’t hand-write.

**Acceptance test:** Catalog validator rejects duplicate namespaced IDs and asserts no two source files claim the same ID; consuming both necklace configs yields distinct IDs.

---

### 4. P2 — “A narrow lint rule enforces the shared component” is not implementable here, and the rule it depends on is actively disabled

**Plan section:** Step 5 (“A narrow lint rule enforces the shared component … Avoid fragile repository-wide string scanning”).

**Failure scenario:** There is no ESLint toolchain in the repo, so this deliverable is “bootstrap ESLint + `eslint-plugin-next` + CI,” not “one narrow rule.” Worse, `no-img-element` cannot tell repo-owned static art from runtime R2/generated media, so it must be suppressed everywhere the plan considers legitimate — which is most places.

**Evidence (verified):**
- No `eslint.config.*`, no `.eslintrc*` anywhere (glob returned none); `package.json` has no `lint` script.
- The rule is already disabled inline throughout, including in the plan’s own target files: `app/pendants/logo/LogoPendantBuilder.tsx:409,439,579`, plus dozens in `app/owner/**`, `NameBuilder.tsx:1342,1393`, etc.

**Correction:** Drop the lint deliverable. Enforce structurally:
1. `StaticThumbnail` accepts **only** `assetId` (no `src`), so callers can’t pass arbitrary paths.
2. Derive the catalog from the **same React-free picker configs** the UI imports (the plan already says “consumes existing source-of-truth configurations”), so adding `{id, src}` to a picker config without a catalog registration makes the generator fail. This removes the need for string scanning entirely (aligns with the plan’s own “avoid fragile scanning”).
3. Update tests that mock arbitrary `src` (e.g., `picturePendants.test.tsx:18-20` supplies `/samples/...`, which will have no assetId).

**Acceptance test:** Add a new `{id, src}` to a picker config without registering it → `npm run thumbnails:check` fails with the ID. An unknown `assetId` fails collation at generation/type level, not silently.

---

### 5. P2 — SVG is not actually covered by the width-variant/srcset contract, and it introduces a Sharp/librsvg dependency

**Plan section:** Asset contract (“Treat SVG as a validated static passthrough with intrinsic dimensions”); Browser component (renders `srcset`/`sizes`).

**Failure scenario:** The manifest type is built around “each generated width, URL, and byte count.” An SVG has no widths. If the generator tries to read intrinsic dimensions via Sharp, it may fail (librsvg availability/size reporting) or rasterize and lose scalability. If it bypasses and the component still emits `srcset`/`fill`, you get a one-entry srcset or a zero-size layout.

**Evidence (verified):** `app/design/DesignEntry.tsx:16` uses `/category-icons/grillz.svg`; it is the only SVG in `public` (glob). The category card uses `fill sizes="(max-width: 640px) 56px, 112px"` (`:67-74`).

**Correction:** Make the manifest a discriminated union: `{kind:"raster", variants:[{w,url,bytes}], width, height}` | `{kind:"svg", href, width, height}`. Render SVG with a plain `<img>` and explicit `width`/`height`, no srcset; don’t rasterize unless the product explicitly wants a WebP fallback.

**Acceptance test:** Generator does not attempt to rasterize `grillz.svg`; design entry renders it and the manifest entry has `kind:"svg"` with no variants.

---

### 6. P2 — The “content key” does not guarantee a new URL when output bytes change, which defeats the immutable 1-year cache

**Plan section:** Asset contract (“Include source bytes, profile output settings, and a generator version in the content key”); Step 4 (production-only `immutable`).

**Failure scenario:** `sharp` is `^0.35.5` (`package.json:54`). A lockfile refresh can upgrade libvips and change encoded output for identical inputs; the hand-maintained “generator version” won’t change, so the URL/bytes pair mutates while the CDN/browser holds the old bytes for a year.

**Correction:** Derive the filename from the **output bytes** (content-addressed output), or include `sharp.versions.vips` plus a bumpable salt in the key. Committing the manifest (finding 2) makes this drift reviewable. Keep `GENERATOR_VERSION` as an explicit knob for setting changes.

**Acceptance test:** Change one WebP setting (or bump sharp) and rebuild; assert the derivative URL changes and the old URL is absent from the new manifest.

---

### 7. P2 — A custom dev launcher + watcher + single-writer lock is unnecessary complexity and breaks the existing Playwright contract

**Plan section:** Step 4 (“development launcher generates the initial manifest before starting Next and watches … shut down watcher/Next children together”); Step 2 (“single writer lock for concurrent dev/build invocations”).

**Failure scenario:** `playwright.config.ts:9` runs `npm run dev -- --port 3001`. If `dev` becomes a wrapper that spawns Next, it must forward `--port`, stdio, and signals, or browser tests hang/timeout. A repo lockfile can go stale after a crash and block local builds; Vercel builds are isolated so the lock buys nothing there.

**Evidence (verified):** `playwright.config.ts:9`; `package.json:6` (`dev` is `next dev`); no `predev`/`pretest` hooks today.

**Correction:** Keep `dev` = `next dev`. Run the one-shot generator in `predev` and `prebuild` (npm runs both automatically). Document “restart dev after adding an asset,” or offer an optional `thumbnails:watch` script people opt into. Drop the lock.

**Acceptance test:** `npm run dev -- --port 3001` starts Next directly; `npx playwright test e2e/smoke.spec.ts` passes; killing the dev process leaves no stale lock or orphan.

---

### 8. P2 — “Global solution” intent vs. picker-only scope leaves real customer-facing originals on the wire

**Plan section:** Outcome (“Every repository-owned thumbnail in the customer design entry pages…”), the goal statement (“global solution for existing and future flow thumbnails”).

**Failure scenario:** The inventory list omits necklace size guides (customer flow), and the wider repo has many large `next/image`/`<img>` originals that users do see (`/onboarding`, landing, login, owner). Either the claim is over-broad or the coverage is incomplete; both cause review/tests to pass while the stated user goal is unmet.

**Evidence (verified):**
- Customer-flow gaps: `app/necklaces/NecklacesBuilder.tsx:23-27,374` (guides); `app/name/NameBuilder.tsx:924` (`chain-options.png`) and `:1112-1121` review previews.
- Other surfaces: `app/new-landing-page/NewLandingPage.tsx` (4 `next/image`), `app/landing/LandingPage.tsx:83`, `app/login/LoginForm.tsx:68`, `app/onboarding/page.tsx:541,781`, `app/owner/**` many.

**Correction:** Decide and document the boundary explicitly. Recommended: cover all **customer design flow** repo-owned UI (pickers + selected previews + guides) and record an explicit exclusion allowlist for marketing/owner/runtime media. Do not claim “global” otherwise.

**Acceptance test:** A committed inventory file enumerates every `next/image` or repo-owned `<img>` under `app/{design,name,pendants,picture-pendants,grillz,bracelets,necklaces}` and maps each to an `assetId` or a listed exception; CI fails if a new one appears.

---

### 9. P3 — Catalog must stay pure; `sharp` usage belongs only in the script (bundle-size risk)

**Plan section:** Architecture (`catalog.ts` “build-only; no React, DB, or environment reads”); Step 4 (exclude from API tracing).

**Failure scenario:** If `catalog.ts` imports `sharp` (e.g., to read intrinsic dimensions) or a server module, a future client/server import could drag native `sharp`/`node:fs` into a bundle or into a traced function — the exact class of >250 MB function problem the existing `next.config.mjs` comments document (`next.config.mjs:33-45`).

**Evidence (verified):** `lib/assets.ts:1-2` imports JSON (safe); `src/lib/picture-styles/catalog.ts:3,25-27` imports `@/data` and `node:path` (safe, but shows the pattern of catalog-adjacent server code). Plan doesn’t forbid `sharp` in the catalog.

**Correction:** Catalog = pure data mapping with relative imports and no `node:fs`/`sharp`; only `scripts/generate-thumbnails.ts` imports `sharp`.

**Acceptance test:** `rg "sharp|node:fs" src/lib/thumbnails/catalog.ts` returns nothing; client bundle analyzer shows no `sharp`.

---

### 10. P3 — “Never upscale” + profile widths + “compute `sizes`” has holes for small assets and static `srcset`

**Plan section:** Asset contract (no upscaling, profiles), Step 3 (“Compute `sizes` from actual grid/container widths”).

**Failure scenario:** Emblems/logo shapes/category icons are small (128–160 px). A `preview` profile asking 320/640/960 either upscales (forbidden) or must omit widths — the component must handle missing `w` descriptors. And `sizes` is a static attribute; it cannot be “computed from actual container widths” for client-measured carousels without JS.

**Evidence (verified):** `app/name/components/EmblemPicker.tsx:102` (`sizes="(max-width: 480px) 145px, 160px"`); `app/design/DesignEntry.tsx:71` (56–112 px); `app/pendants/logo/LogoPendantBuilder.tsx:20-67` shape icons; carousel frames are fixed `h-[184px] w-[184px]` (`src/lib/theme/ui-classes.ts:34`).

**Correction:** Emit `min(requestedWidth, intrinsicWidth)`, dedupe, keep `w` descriptors accurate; accept `sizes` as a per-usage prop (document, don’t “compute”). Keep `fill` inside the already-sized parents.

**Acceptance test:** Register a 128 px source with the `preview` profile; assert no upscaled variant exists and the emitted srcset is valid. Add a browser check that a mobile DPR requests a `≤ intrinsic` width.

---

### 11. P3 — WebP q85 + alpha/color handling needs per-profile treatment for diamond detail and transparent edges

**Plan section:** Asset contract (“Initial WebP quality: 85, subject to visual acceptance”; preserve transparency; normalize to sRGB).

**Failure scenario:** Picker art is transparent cutouts shown with `object-contain` (`ThemedImageOption.tsx:30`, `EmblemPicker.tsx:103`). Lossy WebP can fringe alpha edges; q85 is a guess for pavé/diamond gradients and can band. “Normalize supported color profiles” is not a concrete operation and may silently convert/shift.

**Correction:** Define per-profile quality, and use `alphaQuality`/near-lossless for transparent assets; explicitly convert to sRGB and strip ICC/metadata; validate at 320/640 against a perceptual diff baseline.

**Acceptance test:** Golden-image perceptual diff on 2–3 diamond/alpha assets; assert no visible halos at the smallest emitted width.

---

### 12. P3 — The `public/thumbnails` API-tracing exclusion is largely speculative; keep config unchanged until proven

**Plan section:** Step 4 (“Exclude `public/thumbnails/**/*` from API function tracing”; “Confirm explicit route includes cannot pull derivatives…”).

**Failure scenario:** Over-configuring excludes is mostly harmless but adds confusion. More importantly, the existing exclusions are load-bearing (`next.config.mjs:22-60`) and should not be edited casually. Thumbnails live in a brand-new directory that is not in any `outputFileTracingIncludes` (`:4-21`), and public dirs are only traced when a route dynamically reads them.

**Evidence (verified):** `next.config.mjs:12-21` includes only `public/pendants`, `public/plain-pendants`, `public/emblems`, `public/style-fonts`, `public/logo-pendants/references`; thumbnails are not listed; blanket `public/**` exclusions already exist for the vvs-studio job (`:57-59`).

**Correction:** Leave existing tracing config intact. Add a thumbnails exclude only if a `next build` trace inspection shows derivatives included.

**Acceptance test:** After build, grep the function trace/`.nft.json` for `/thumbnails/`; expect none, with no new excludes added.

---

## Recommended minimal revised architecture

1. **Originals untouched** in existing `public/` dirs; derivatives in `public/thumbnails/` (gitignored).
2. **Manifest committed** at `src/lib/thumbnails/manifest.json` (or `.ts`); derivatives only are ignored. Generator validates/refreshes it in `predev`/`prebuild`; `thumbnails:check` (CI) fails on drift. This fixes findings 2 and 6 and removes the “clean checkout is broken” class.
3. **Type-level enforcement**: `StaticThumbnail` takes only `assetId` (plus `sizes`, alt, priority, classes). No `src`. Handles `raster | svg` union. This replaces the lint rule (finding 4, 5).
4. **Catalog derived from React-free picker configs**, not a hand-maintained parallel list. Extract inline `{id,label,src}` from `WomensBraceletBuilder`, `IcedoutBraceletBuilder`, `NameBuilder` (PLAIN_STYLES), `LogoPendantBuilder` (SHAPES), `NecklacesBuilder` (SIZE_OPTIONS guides), `DesignEntry` categories into small `.ts` modules the UI **and** generator import. Namespaced IDs (finding 3).
5. **Coverage = picker + selected preview + guides**; marketing/owner/runtime are an explicit, documented exclusion list (finding 1, 8).
6. **One-shot generation**: `scripts/generate-thumbnails.ts` (only `sharp` importer), npm `predev`/`prebuild`/`thumbnails:check`. No watcher, no lock; `dev` remains `next dev` (finding 7, 9).
7. **Cache**: output-content-addressed filenames + `immutable` for `/thumbnails/*`; verify (don’t preemptively exclude) tracing (finding 6, 12). SVG passthrough with explicit dimensions (finding 5). Per-profile quality + alpha handling (finding 11).

## Unnecessary complexity / hard to enforce

- Custom dev launcher with source watcher, dual-child shutdown, and single-writer lock (finding 7) — replace with npm lifecycle hooks.
- Lint-rule-based coverage enforcement (finding 4) — replace with type-level `assetId` + catalog derivation.
- `profiles` with a 960 px `preview` width applied to small assets (finding 10) — cap by intrinsic width.
- Blanket `public/thumbnails` tracing exclusion (finding 12) — verify first.
- “Compute `sizes` from actual container widths” (finding 10) — not achievable statically; make it a prop.

## Not checked / incomplete

- **No byte/dimension verification** of the “1368×1536, 10.9 MiB, four PNGs” claim or any source (no execute tool). Treat all size claims as unverified.
- **`tsx` + tsconfig `@/` path resolution**: existing build-time scripts are `.mjs` and read JSON via `fs` (`scripts/manage-styles.mjs:18,60`), and `scripts/test-notification-recovery.ts` imports only node/prisma. I could not confirm `tsx scripts/*.ts` resolves `@/data/...`. Pre-flight: `npx tsx -e "import('@/data/pendant-styles.json')"` from root; if it fails, the catalog/generator must use relative imports (or `tsx --tsconfig`). This is the single most likely build blocker and should be tested before writing the plan’s first line of code.
- **Sharp/libvips `librsvg` support** for SVG intrinsic dimensions/rasterization in this install — unverified (finding 5).
- **Actual maximum source pixel dimensions** to set the plan’s “explicit pixel limit” — unverified; too low a limit will fail legitimate assets.
- I did not read `.env`, credentials, R2/upload code paths, or customer data, and I did not trace every API route’s `fs` behavior beyond the `next.config.mjs` comments.
- Owner/landing/onboarding `next/image` enumeration was truncated; the finding-8 list is representative, not exhaustive.