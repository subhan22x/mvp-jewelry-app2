# Code Structure Review — refactoring playbook for coding agents

Reviewed: 2026-07-02. Scope: structural/code-quality findings for the MVP → production transition.
All findings are **behavior-preserving refactors** unless explicitly flagged otherwise.

## How to use this document (read first)

This is a set of instructions from a reviewing agent to an implementing agent. Follow these
ground rules for every finding:

1. **Read `CLAUDE.md` before touching anything.** It contains hard constraints (e.g. never put
   prompt text in TypeScript, never switch over `styleId`, don't remove `outputFileTracingExcludes`).
   Nothing in this document overrides `CLAUDE.md`.
2. **Start green.** Run `npm test` (vitest) and `npx tsc --noEmit` before you begin. If either
   fails before your change, stop and report — do not fix unrelated breakage inside a refactor.
3. **One finding per branch/PR; one mechanical step per commit.** Never combine findings.
4. **After every step:** `npx tsc --noEmit && npm test`. Commit only when both pass.
5. **Do not "improve" behavior while refactoring** (different error text, different status codes,
   different defaults) unless the finding explicitly says the behavior change is intended.
6. Findings are ordered by production risk. If told to "work through the review", do them in
   order 1 → 6; skip Finding 5 unless explicitly asked (highest regression risk, needs e2e
   coverage first).

Verification commands used throughout:

```bash
npx tsc --noEmit        # type check
npm test                # vitest unit/route tests
npm run test:e2e        # Playwright (needs dev server on :3001)
npm run build           # full Next.js production build
```

---

## Finding 1 — Usage metering silently disables itself (fail-open guards)

**Priority: highest. Do this first.**

### Current issue

`src/lib/usage.ts` contains four runtime guards of the form:

- line ~63: `if (!("usagePlan" in prisma)) return DEFAULT_MONTHLY_LIMITS[kind];`
- line ~78 and ~100: `if (!("accountUsageBucket" in prisma)) { ...return fake success... }`
- line ~134: `if (!("usageEvent" in prisma) || !("accountUsageBucket" in prisma)) { ...return fake event... }`

These exist to tolerate a Prisma client generated from an older schema. The failure mode is
inverted: if a stale client ever ships, **usage limits and usage recording silently turn off** —
every store gets unmetered generation and the only symptom is the provider bill. Guards that
protect revenue must fail closed, not open.

### Proposed change

Delete all four guards. The models (`UsagePlan`, `AccountUsageBucket`, `UsageEvent`) exist in
`prisma/schema.prisma`, so the guards are dead weight in any correctly built environment.

### Step-by-step plan

1. Confirm the models exist: `grep -n "^model UsagePlan\|^model AccountUsageBucket\|^model UsageEvent" prisma/schema.prisma` — expect three hits. If any is missing, stop and report.
2. In `src/lib/usage.ts`, remove each `in prisma` conditional **and its early-return block**,
   keeping the code path below it. Four sites total (`monthlyLimit`, `getMonthlyUsageSummary`,
   `ensureUsageAvailable`, `consumeUsageCredit`).
3. `npx tsc --noEmit && npm test`. Expect some tests to fail **if their Prisma mocks omit these
   models** — that is the guard's hidden dependency. Fix by extending the test mocks to include
   `usagePlan`, `accountUsageBucket`, `usageEvent` stubs. Do **not** re-add the guards to make
   tests pass.
4. Manual verification: run the dev server, perform one name generation, confirm a
   `UsageEvent` row and an incremented `AccountUsageBucket.used` appear.

### Risk assessment

Low code risk; the deliberate effect is that a mis-generated client now throws loudly instead of
running unmetered. The only expected fallout is test mocks (step 3).

---

## Finding 2 — Two byte-identical 762-line Prisma schemas

### Current issue

`prisma/schema.prisma` and `prisma/schema.postgres.prisma` are **byte-identical**
(`diff` returns nothing as of this review). Consumers:

- `prisma generate` (via `scripts/prisma-generate-runtime.mjs`) uses the default `prisma/schema.prisma`.
- `scripts/push-supabase-schema.mjs` runs `prisma db push --schema prisma/schema.postgres.prisma`.

Every model change must be made twice, and nothing detects drift. The first time someone edits
only one file, the generated client and the pushed database diverge silently. This split is
vestigial (it predates the Postgres migration; both files now declare the same datasource).

### Proposed change

Single source of truth: keep `prisma/schema.prisma`, delete `prisma/schema.postgres.prisma`,
point the push script at the remaining file.

### Step-by-step plan

1. Re-verify identity first: `diff prisma/schema.prisma prisma/schema.postgres.prisma`.
   **If output is non-empty, stop and report the diff** — the files have drifted since this
   review and a human must decide which side is correct.
2. In `scripts/push-supabase-schema.mjs`, change `--schema prisma/schema.postgres.prisma` to
   `--schema prisma/schema.prisma`.
3. `git rm prisma/schema.postgres.prisma`.
4. Search for stragglers: `grep -rn "schema.postgres" . --include="*.mjs" --include="*.json" --include="*.md" | grep -v node_modules` — update any hits (README/docs mention the file).
5. Verify: `npm run prisma:generate` succeeds; then `npm run build`. Do **not** run
   `npm run supabase:push` against a real database as part of this refactor — just confirm the
   script builds its arg list correctly (dry-read the file).

### Risk assessment

Low. The only consumer of the deleted file is the push script. Deployment configs
(Vercel/Render) should be grepped for the filename too before merging.

---

## Finding 3 — Five copy-pasted generation routes + ten error-helper variants

### Current issue

These routes repeat the same orchestration skeleton (~1,126 lines combined):

- `app/api/requests/route.ts` (188 lines)
- `app/api/grillz-requests/route.ts` (237)
- `app/api/bracelet-requests/route.ts` (195)
- `app/api/necklace-requests/route.ts` (306)
- `app/api/picture-requests/route.ts` (200)

The shared skeleton: parse Zod body → `resolveAccountIdFromSlug(...) ?? getDefaultAccountId()` →
`ensureUsageAvailable` → create `Request` row → build variants → create pending `Result` rows →
`scheduleBackgroundTask` that generates each variant, updates its row, calls
`consumeUsageCredit` and `ensureDraftQuoteForRequest` → return `{requestId}` → error envelope
via `usageErrorResponse`. Adding rate limiting or the required-slug security fix currently means
five identical edits (shotgun surgery), and the routes have already drifted.

Additionally `getGenerationErrorMessage` is copy-pasted into **10 files** and the copies are
**not identical** — there are 4 behavior groups (verified by diff):

| Variant | Files | Behavior |
| --- | --- | --- |
| Full JSON-extracting | `app/api/requests/route.ts`, `app/api/picture-requests/route.ts` | Extracts `error.message` from embedded provider JSON, falls back to `err.message`, then `'Image generation failed.'` |
| Simple | `app/api/grillz-requests/route.ts`, `app/api/bracelet-requests/route.ts`, `app/api/necklace-requests/route.ts` | `err.message \|\| "Image generation failed."` |
| Video fallback | `app/api/videos/route.ts`, `app/api/owner/video-jobs/route.ts` | Like simple, video-specific fallback text |
| Other | `app/api/owner/model-jobs/route.ts` ("3D generation failed."), `app/api/requests/[id]/revisions/route.ts`, `src/lib/generation-lab/runner.ts` | Near-simple, distinct fallback text |

### Proposed change

Two extractions, done as separate steps:

1. One shared error helper: `getGenerationErrorMessage(err: unknown, fallback = "Image generation failed.")`
   in `src/lib/generation/error-message.ts`, using the **JSON-extracting** implementation
   (it is a superset — when there is no embedded JSON it behaves like the simple variants).
   Callers pass their own fallback ("3D generation failed.", video text, etc.).
   **Flagged behavior change (intended):** the simple-variant routes will start extracting
   cleaner messages from provider JSON errors. Persisted `Result.error` text may differ for
   provider failures. This is an improvement; do not preserve the old raw-JSON messages.
2. One orchestrator, e.g. `src/lib/generation/run-generation-request.ts`, extracted from the
   cleanest route (`app/api/requests/route.ts`). Routes keep their own Zod schema and
   product-specific mapping; the orchestrator owns account resolution, usage, row lifecycle,
   background scheduling, and the error envelope.

**Constraint from CLAUDE.md:** this touches only the transport layer. Do not move any prompt
text, do not add a `switch (styleId)`, do not change `buildVariants` or the style system.

### Step-by-step plan

1. **Error helper first (own PR).** Create `src/lib/generation/error-message.ts` with the
   JSON-extracting implementation plus a `fallback` parameter. Replace all 10 local copies,
   passing each file's current fallback string. Delete the local functions. Commit.
2. **Orchestrator, one route.** Read `app/api/requests/route.ts` fully. Extract the skeleton
   into `runGenerationRequest(...)` with injection points for: usage kind + quantity,
   `createRequestRow(accountId)` (returns the Prisma `Request`), `buildVariantsForRequest(...)`,
   and an optional post-success hook (`ensureDraftQuoteForRequest`). Migrate **only**
   `app/api/requests/route.ts`. Its `__tests__/route.test.ts` must pass **unchanged** — if a
   test needs editing, the extraction changed behavior; fix the extraction instead. Commit.
3. **Migrate siblings one commit each**, in order: `bracelet` → `grillz` → `picture` →
   `necklace` (necklace last; at 306 lines it has the most route-specific logic). For each:
   first `diff` its skeleton against the orchestrator's behavior and list the differences.
   Genuine product differences stay in the route or become hook parameters — do not force them
   into the shared core, and do not silently drop them. Each route's test file must pass
   unchanged before committing.
4. Do **not** migrate `app/api/requests/[id]/revisions/route.ts`, the video/model-job routes, or
   `generation-lab/runner.ts` onto the orchestrator in this pass. They share the error helper
   (step 1) only.

### Risk assessment

Medium. The trap is drifted per-route behavior getting flattened into the shared core. Mitigation
is built into the plan: per-route diffs, per-route commits, and the rule that existing route
tests must pass unchanged. Final check: one real generation per category in dev
(name, grillz, bracelet, necklace, picture) — confirm results appear and `Result.prompt` is
still persisted (hard requirement from CLAUDE.md).

---

## Finding 4 — Five import-alias spellings and two shim folders

### Current issue

Imports use five alias forms (`@/src/...` ×280, `@/server/...` ×83, `@/app/...` ×31,
`@/lib/...` ×15, `@/data/...` ×2). `@/lib/styles/*` and `@/server/db/client` resolve through
physical re-export shim folders (`lib/`, `server/`) that exist only because tsconfig paths were
never wired (this is roadmap item 2 in `CLAUDE.md`). One file commonly mixes three spellings.
The shims obscure where code actually lives and every new file guesses at the convention.

### Proposed change

Wire tsconfig path aliases per the `CLAUDE.md` roadmap, codemod imports of the shimmed paths to
their real locations, delete the shim folders.

### Step-by-step plan

1. Read the current `tsconfig.json` `paths` block. Add mappings so `@/src/*`, `@/app/*`, and
   `@/data/*` keep resolving, and add direct mappings for the shimmed paths per `CLAUDE.md`:
   `"@/lib/styles/*": ["./src/lib/styles/*"]`, `"@/server/*": ["./src/server/*"]` — but first
   verify where the real modules live (`ls src/lib/styles src/server 2>/dev/null`); if
   `src/server` does not exist, inspect `server/db/client.ts` to find what it re-exports and
   target that real path instead. Do not guess.
2. Restart the TypeScript server / dev server (Next.js caches tsconfig paths).
3. `npx tsc --noEmit` — expect zero errors before any import edits (the aliases should be
   backward compatible). If errors appear, fix the mappings, not the imports.
4. Mechanical codemod, one alias family per commit: rewrite `@/lib/styles/...` imports to the
   canonical target, run `npx tsc --noEmit`, commit. Repeat for `@/server/...`.
5. When `grep -rn "from ['\"]@/lib/\|from ['\"]@/server/" app src --include="*.ts" --include="*.tsx"`
   returns nothing, delete the shim folders (`lib/styles/` re-export layer, `server/db/client.ts`)
   and their tsconfig entries if now redundant. `npx tsc --noEmit && npm run build`.
6. Update `CLAUDE.md`: mark roadmap item 2 done and delete the "Don't trust the `lib/styles/`
   re-export layer to stay" bullet.

### Risk assessment

Low — the compiler catches every miss. Two gotchas: (a) Next dev server must be restarted to see
tsconfig changes; (b) run `npm run build` at the end because Vercel's file tracing follows the
import graph and `next.config.mjs` has tracing excludes that assume current layout.

---

## Finding 5 — God components: the four wizard builders

**Do not start this without e2e coverage. Highest regression risk in this document.**

### Current issue

Four customer wizard builders reimplement the same skeleton — step state machine, option
selection, POST-then-poll-every-2s loop, progressive result tiles, error states:

- `app/name/NameBuilder.tsx` — 1,491 lines
- `app/grillz/GrillzBuilder.tsx` — 713
- `app/necklaces/NecklacesBuilder.tsx` — 564
- `app/picture-pendants/PicturePendantsBuilder.tsx` — 558

(Related but separate: `app/owner/vvs-studio/VvsStudioWizard.tsx` at 1,311 and
`app/onboarding/page.tsx` at 826 — out of scope for this finding.)

A UX change to "how results appear while generating" is currently four parallel edits.

### Proposed change

No grand unification. Extract exactly two shared pieces, then split builders opportunistically:

1. `useGenerationPolling(requestId)` hook — owns the POST response → poll `GET /api/requests/{id}`
   every 2s → update tiles → stop on `done === true` loop.
2. A shared results-grid component for the progressive tiles.

Split step-screens out of a builder only when you are next asked to change that builder's UX.

### Step-by-step plan

1. **Precondition:** extend `e2e/smoke.spec.ts` (name flow only today) with step-navigation specs
   for grillz, necklaces, and picture-pendants. Generation-completion specs need the
   `MOCK_IMAGE_API` mock mode (CLAUDE.md roadmap item 5) — if it doesn't exist yet, cover
   step navigation only and say so in the PR.
2. Read `app/name/NameBuilder.tsx` in full. Extract the polling logic into
   `src/hooks/useGenerationPolling.ts` (or the repo's hook convention — check for an existing
   hooks directory first). Adopt it in NameBuilder **only**. `npm run test:e2e` must pass. Commit.
3. Adopt the hook in the other three builders, one PR each, diffing each builder's polling code
   first — endpoints differ (`/api/grillz-requests` etc.) and payload shapes may differ; the hook
   takes the endpoint/parse as parameters rather than hardcoding.
4. Extract the shared results grid only if the four tile implementations are actually congruent —
   verify by reading all four before writing anything. If they diverge meaningfully, stop at the
   hook.

### Risk assessment

High for UI regressions; these components are the revenue path. Mitigations: e2e first, one
builder per PR, and manual verification of each wizard end-to-end in dev after each PR. Never
refactor a builder and change its UX in the same PR.

---

## Finding 6 — Storefront quote route: no transaction, dead usage kind

### Current issue

`app/api/storefront/[accountSlug]/quote/route.ts` creates a `Lead` and then a `QuoteRequest` as
two separate writes (~lines 54–75). A crash between them leaves an orphaned lead with no quote.
Separately, the `quote_requested` usage kind is defined in `src/lib/usage.ts` (`USAGE_KINDS`)
with a limit in `src/lib/billing/plans.ts` (250/month) but **no code path ever consumes it** —
it is dead configuration that misleads readers into thinking quote submissions are metered.

### Proposed change

1. Wrap the two creates in `prisma.$transaction` (behavior-preserving).
2. The `quote_requested` question is a **product decision** (should quote submissions count
   against a plan?) — do not decide it in code. Leave the enum entry, and add the question to
   `SAAS_PRODUCT_MAP.md` "Open Questions To Decide Before Launch".

### Step-by-step plan

1. In the quote route, replace the sequential `prisma.lead.create` + `prisma.quoteRequest.create`
   with a single `prisma.$transaction(async tx => { ... })` returning both rows. Keep the file
   uploads **outside** the transaction (they're slow I/O; do them before, as today).
2. `npx tsc --noEmit && npm test`.
3. Manual check: submit a storefront quote in dev; confirm one `Lead` and one `QuoteRequest`
   row, and that the owner dashboard shows the quote.
4. Add the open question to `SAAS_PRODUCT_MAP.md` if not already present.

### Risk assessment

Minimal. Watch one detail: the route returns `leadId` and `quoteRequestId` — keep the response
shape identical.

---

## Finding 7 — Micro-smells (batch into one cleanup commit)

Each is a one-line, zero-risk fix. Do them together in a single commit.

1. `app/api/requests/route.ts:71` — `await ensureUsageAvailable(accountId, 'design_image_generated', isPlain ? 2 : 2);`
   Both ternary branches are `2`. Replace with the literal `2`. **If you believe plain pendants
   were meant to cost a different amount, do not guess — flag it to a human.** The refactor-safe
   change is removing the no-op conditional only.
2. `app/owner/account/page.tsx:56` — `usage={[usage[0], usage[1]]}` re-wraps an array that is
   already that exact tuple; pass `usage={usage}` (the surrounding `Promise.all` already yields
   the 2-tuple; keep the type annotation happy — if TS complains about tuple inference, add
   `as const` or a tuple type at the `Promise.all`, not a re-wrap at the call site).
3. Hardcoded usage-kind strings at call sites (e.g. `"quote_responded"`,
   `"vvs_product_post_generated"` in `app/owner/account/page.tsx`) type-check against the union
   today, so this is acceptable; if a kind is ever renamed, TypeScript will catch it. No action
   required — listed here so a future agent doesn't "fix" it into something heavier.

---

## Suggested sequencing

| Order | Finding | Why |
| --- | --- | --- |
| 1 | Finding 1 (usage fail-open) | Cheap; protects revenue in production |
| 2 | Finding 2 (dual schema) | Cheap; removes a silent-drift trap |
| 3 | Finding 7 (micro-smells) | Trivial; clears noise |
| 4 | Finding 4 (aliases/shims) | Makes every later refactor cleaner; compiler-verified |
| 5 | Finding 6 (quote transaction) | Small correctness win |
| 6 | Finding 3 (route orchestrator) | Do before adding rate limiting / required-slug so those land once, not five times |
| 7 | Finding 5 (wizard builders) | Only with e2e coverage; opportunistically thereafter |
