# Static thumbnail pipeline validation

Branch: `codex/static-thumbnail-pipeline`. Validation performed locally on
2026-10-06, then repeated from an isolated export of the committed branch on
current main. A PR was opened; deployment checks are tracked separately.

## Results

| Check | Result |
| --- | --- |
| Full Vitest suite | Isolated committed checkout: 73 files passed, 2 skipped; 570 tests passed, 5 skipped |
| Focused generator/component tests | 14 passed |
| TypeScript | `npx tsc --noEmit --incremental false` passed |
| Clean production build | Passed after moving derivative output and conversion cache out of the repo |
| Repeat/check generation | 62 registered IDs; 0 converted, 57 verified conversion groups reused |
| Dev watcher integration | Passed source/config edits, failure-safe missing source, new directory recovery, registration removal, missing module recovery, forwarded port, child cleanup |
| Browser checks | 12 routes at 390px and 1440px, DPR 2; all registered images loaded, no page errors, failed image responses, or horizontal overflow |
| Interaction | Invisible Set selection -> customization -> review passed; preset review uses generated static image |
| Visual checks | Mobile grillz and desktop logo screenshots inspected for detail, containment, alpha edges, and layout |
| Production cache headers | Local production server returned `public, max-age=31536000, immutable` for all four grillz thumbnails |
| API traces | 79 checked; none included `public/thumbnails/`; logo route retained 4 original references and name route retained 22 |
| Original assets/prompt mappings | No original image or server generation source/config files changed |
| Whitespace | `git diff --check` passed |

Browser routes: `/design`, `/pendants`, `/name`, `/pendants/nameplates`,
`/picture-pendants`, `/pendants/logo`, `/grillz`, `/bracelets`,
`/bracelets/icedout`, `/bracelets/womens`, `/necklaces`,
`/necklaces/slim_cuban`.

Browser automation used installed Playwright/Chromium. Screenshots and response
records were saved under `/tmp/thumbnail-*` and `/tmp/thumb-*` during validation.
The watcher check is reproducible with `node scripts/thumbnails/check-watch.cjs`
(port 3059 must be free).

The earlier working-directory run reported 988 passing tests and 10 skips; it
also discovered tests in an ignored nested `.claude/worktrees/` checkout. The
primary count above is the isolated PR checkout, without those unrelated files.

## Measured grillz transfer reduction

The four originals total **11,385,116 bytes**. Fresh mobile and desktop production
browser sessions both selected four 640px WebP files totaling **219,412 bytes**:
**98.07% fewer image bytes for these four thumbnails**. This comparison excludes
store branding, interactive tooth artwork, and other non-thumbnail resources;
it is not a claim about total page download size or load latency.

The smaller 320px derivatives total 68,928 bytes, but the tested DPR 2 browser
sessions requested 640px, so the production measurement above uses actual
response bodies rather than the smallest possible files.

## Remaining boundaries

- Registered static customer display assets are covered. Arbitrary future JSX,
  runtime uploads, generated images, owner/marketing imagery, and store logos
  are not automatically classified or transformed.
- A completely new flow must register its metadata once. Existing registered
  metadata entries regenerate automatically.
- Old local derivative URLs are retained. Deployments are not a permanent
  archive of every older URL; old tabs spanning deployments can need refreshing.
- The build passed with existing warnings about default imports of
  `registryModule` and `textReferenceModule` in the unchanged internal generations
  page, plus the existing outdated Browserslist database warning.
- Production cache behavior was checked locally; a deployed Vercel preview has
  not been exercised for this branch.
