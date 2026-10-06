# Static customer thumbnails

Repository-owned customer picker cards, category cards, guides, and selected
style previews use build-generated responsive WebP files. They do not use the
Next/Vercel runtime image optimizer. Model references, compositor masks/base
images, full-size viewers, and downloads still use originals.

## Adding or changing images

1. Put the original under `public/` and add it to the flow's existing pure
   metadata. Shared inline choices live in `src/lib/thumbnails/flow-assets.ts`.
2. For an existing registered flow, new metadata entries are automatic. For a
   new flow, register its metadata once in `scripts/thumbnails/catalog.ts` with
   a namespaced stable ID and an `icon`, `picker`, or `preview` profile. Match
   browser visibility; register display images, not internal model references.
3. Render `StaticThumbnail` with its registered ID (or
   `thumbnailIdForSource(originalPublicUrl)`), descriptive `alt`, accurate `sizes`,
   and existing containment/crop classes. Use `fill` inside a positioned frame.
   Missing registration throws; it never silently loads a multi-megabyte original.
4. Run `npm run thumbnails` and commit the changed generated manifest alongside
   originals/metadata/UI. Run `npm run thumbnails:check` to detect manifest drift.
   Derivative files and `.thumbnail-cache/` stay ignored.

`npm run dev -- --port 3001` and `run.sh` generate first and watch registered
sources/config dependencies. New or changed registered sources regenerate without
restarting Next. A temporary conversion error retains the previous manifest;
correcting the source triggers another pass. Adding a file to an arbitrary folder
alone does not register it. `npm run build` also generates before compilation;
install development dependencies for build/dev (tsx, TypeScript).

## Sizes, quality, and cache behavior

- Icons: 80/160/320px; picker images: 160/320/640px; previews:
  160/320/640/960px. Actual widths stop at the original width.
- Default WebP quality 85; registration supports an explicit quality override.
  Transparency, aspect ratio, EXIF orientation, and sRGB are preserved/normalized.
- SVGs are validated hashed passthrough files with dimensions; no raster srcset.
  Animated files are rejected rather than silently flattened.
- Conversion caching includes source bytes, widths, settings, and encoder
  versions. Cached derivatives are hash-verified. URLs hash output bytes, so
  immutable production caching is safe when content changes.
- Old derivatives are retained locally to avoid breaking open tabs. To reclaim
  disk space, stop all dev/build processes, delete `public/thumbnails/` and
  `.thumbnail-cache/`, then regenerate. Never clean during an active session.
- Browsers/CDNs decide cache retention. A new deployment does not archive every
  older URL; an old tab across deployments can require refreshing.

Run `node scripts/thumbnails/check-watch.cjs` for an isolated development-launcher
check (port 3059 must be free). It exercises configuration/source edits, missing
source recovery, registration removal, port forwarding, and child shutdown.

## Scope and checks for new flows

Use the shared component for static customer thumbnails and review previews;
check mobile/desktop widths, transparent edges, detail, and selection behavior.
Full-size views may intentionally use originals. Upload previews, generated
results, account logos, marketing images, and interactive tooth artwork need
separate treatment; they are not automatically transformed by this pipeline.

Keep the browser manifest out of server prompt builders. API function tracing
excludes `public/thumbnails/`, while generation attachment paths remain originals.
See `docs/plans/static-thumbnail-pipeline.md` for acceptance checks and review
corrections.
