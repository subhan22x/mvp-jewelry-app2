# Adversarial review of the static thumbnail plan

Reviewed plan: `docs/plans/static-thumbnail-pipeline.md`.

Two independent OpenCode CLI sessions used the explicitly selected model
`opencode-go/deepseek-v4.1-flash`. Both completed successfully. The deployment
reviewer focused on builds, caching, watcher lifecycle, pruning, and tracing. The
coverage reviewer focused on asset registration, UI migration, responsive image
behavior, and future flows. Each received the complete plan, feature intent,
repository context, known failure scenarios, and instructions to inspect source
and report actionable holes. Read/glob/grep access was allowed; edits, shell
execution, and secret-file reads were denied. No application implementation or
live generation was performed.

Raw reports:

- `2026-10-06-thumbnail-plan-deployment-deepseek.md`
- `2026-10-06-thumbnail-plan-coverage-deepseek.md`

## Consolidated assessment

The architecture is viable, but the current plan needs clarification before
implementation. The following findings combine overlapping reviewer claims and
independent source checks. Scenarios involving the future generator remain
design risks, not bugs proven in code that does not yet exist.

| Priority | Hole | Correction to specify before implementation |
| --- | --- | --- |
| P1 | An ignored manifest imported by application modules is absent on a clean checkout. Existing tests directly import builders (`app/name/__tests__/nameBuilder.test.tsx:5`); `package.json:11` runs Vitest without generation. Standalone type checking has the same bootstrap issue. | Choose a bootstrap contract explicitly. Recommended: commit a small deterministic manifest/type contract, regenerate derivatives before serving/building, and validate source/settings drift. Define mock entries for tests rather than depending on all production conversions. |
| P1 | Wiring only one dev launcher misses documented entrypoints. `run.sh:138-140` directly starts Next; `playwright.config.ts:9` invokes `npm run dev`. | Delegate `run.sh` to the same npm dev entrypoint. Cover dev, build, tests, and standalone type checking; preserve forwarded ports and signal cleanup. Prove each supported path from a clean checkout. |
| P2 | Stable asset IDs are not namespaced. Necklace UI and reference configurations use the same style IDs for distinct images (`app/necklaces/necklace-options.ts`, `src/lib/necklaces/config.ts`). | Namespace by product and display role, such as `necklace.slim_cuban.picker` and `necklace.slim_cuban.color.white_gold`. Keep domain style IDs used by APIs unchanged. |
| P2 | A separate literal catalog or inventory can drift from picker definitions. Availability filtering also differs: `lib/assets.ts:31-39` filters hidden name styles but retains picture styles with availability metadata. | Derive registration from shared React-free display metadata. Catalog the images actually rendered, including disabled options if they show art. Avoid a second copy of labels/source paths or a generic availability filter. New flows still need explicit registration and review. |
| P2 | Automatic orphan pruning can delete files referenced by an open tab, an older HMR module, or another local server. Atomic manifest rename does not protect those readers. | Never prune in watch mode or against an actively served shared output directory. Use fresh deployment staging output; make local prune explicit and document its conditions. Test that old URLs remain usable during a live source update. |
| P2 | Source/settings/manual-version hashes can remain unchanged when an encoder upgrade changes bytes, violating immutable URL semantics. | Separate the conversion-cache key from the served-file hash. Include Sharp/libvips versions and exact options in cache keys, and hash emitted bytes for served URLs. Test source, settings, and toolchain invalidation. Do not assume cross-platform encoder output is byte-identical. |
| P2 | Lock scope, crash recovery, watcher exclusions, and port/signal forwarding are unspecified. A lifetime watcher lock can block builds; watching outputs can cause regeneration loops. | Lock individual conversion/publication passes with bounded waits and stale-holder recovery. Watch registered inputs/configuration only, never outputs or the manifest. Forward Next arguments and terminate child processes together. Avoid any lock across the lifetime of a watcher. |
| P2 | The migration inventory does not explicitly enumerate every static display role. Selected-style previews and necklace size guides can continue loading originals. Absence of `/_next/image` requests alone is not evidence of reduced bytes. | Enumerate picker, selected-preview, and guide uses. Include necklace size guides (`app/necklaces/NecklacesBuilder.tsx:374`) and static name preview artwork. Measure actual requested URLs and cold transfer bytes at each migrated step. State separately whether marketing/owner thumbnails are in scope. |
| P2 | A proposed custom lint rule has no existing lint configuration to extend, and cannot infer image purpose reliably. An arbitrary new raw `<img>` is not prevented merely because registered components use IDs. | Use a typed registered-asset API, shared metadata, focused coverage tests, and a new-flow review checklist. Explicitly state that arbitrary unregistered JSX cannot be automatically classified. Do not add an entire lint system just to claim semantic coverage. |
| P2 | The manifest contract assumes raster width variants but also promises SVG passthrough. Small sources and normalized orientation need accurate intrinsic dimensions/descriptors; presentation styles include emblem translations (`app/name/components/EmblemPicker.tsx:104`). | Define distinct raster/vector manifest entries. SVG renders its original vector URL with validated dimensions and no raster srcset. Record post-orientation dimensions and actual output widths, deduplicate capped variants, and support existing style/transform props. Test small images, rotated input, alpha edges, and fill layout. |

## Additional decisions

- Keep the build catalog and Sharp imports outside the browser component graph.
  The component should consume only the manifest/asset types. Pure shared flow
  metadata may be imported by both UI and generation scripts; do not import page
  components or server compositing catalogs into the browser.
- Choose whether the generator is `.mjs` or uses `tsx`, and specify build
  dependency requirements. A reviewer classified missing `tsx` under
  `npm ci --omit=dev` as P1; this is conditional, since the existing application
  build already uses development tooling. Normal Vercel build installation was
  not verified by these reviewers. A production-dependency-only build is not an
  established repository requirement.
- WebP quality/alpha settings require visual validation. Default quality 85 is
  a starting point, not evidence that pavé detail or transparent edges survive.
- Hash-addressed URLs can use immutable caching in production and previews.
  Verify actual headers. Cache headers do not guarantee that old assets remain
  available after switching deployments: an old page may request an old URL
  through the new deployment. Specify retention/stable asset hosting if that
  cross-deployment guarantee is required; local no-prune alone does not solve it.
- A committed manifest prevents missing imports, but its freshness check must
  account for encoder/toolchain changes and supported build platforms. Do not
  demand identical output bytes across arbitrary Sharp/platform combinations.
- Keep the API thumbnail exclusion and validate it in traces. The coverage
  reviewer suggested waiting until derivatives appear in traces, but existing
  `next.config.mjs:33-45` explicitly documents dynamic public reads that pull in
  unrelated directories. This repository has already suffered that failure.
  Native dependencies and an application manifest appearing in server output
  are not themselves proof of oversized function packaging; measure the traces.
- Do not adopt the deployment reviewer's recommendation to eliminate all
  shared metadata extraction: a duplicate literal catalog conflicts with the
  future-flow consistency goal. Extract only the inline display metadata needed
  to establish one source of truth.
- Do not claim disabling animations/SVG support is safe simply because today's
  inventory is small. Explicit unsupported-format errors are cheap and useful;
  vector passthrough does not require rasterizing SVG with Sharp.

## Required plan changes and verification

Before application work, update the plan with the ten decisions above, including
exact startup/bootstrap behavior, registration boundary, output retention,
manifest variants, and conversion-cache/served-URL hash distinction. Preserve
the intended automatic dev refresh unless the user chooses a simpler manual
workflow; reviewers' suggestions to drop the watcher are tradeoffs, not
requirements.

Implementation validation should exercise clean-checkout tests/type checking,
all supported startup paths, source replacement with an open page, concurrent
passes and a crashed writer, new asset registration, small/rotated/vector assets,
missing/corrupt sources, original attachment integrity, real cold transfer bytes,
and deployment tracing/cache headers. The reviewers did not run those checks;
this review evaluates the plan and current source structure only.
