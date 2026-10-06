# Static thumbnail pipeline implementation plan

Status: implemented locally; validation results are reported with the change.

## Intent and boundaries

Customer category cards, style/emblem/shape pickers, static instruction guides,
and selected-style review previews should load appropriately sized static assets.
Original images remain unchanged for AI attachments, picture compositing,
full-size viewers, and downloads. Customer uploads, generated results, store
logos, marketing imagery, and interactive tooth layers are outside this build
pipeline. Asset purpose is declared explicitly; directories are never scanned to
infer what an image is for.

## Architecture and implementation

1. **Share source metadata.** Keep existing JSON registries and pure flow config.
   Extract inline UI choices into `src/lib/thumbnails/flow-assets.ts`; both UI and
   the build-only `scripts/thumbnails/catalog.ts` consume those definitions.
   Match actual visibility, including disabled picture cards that still render.
   Register namespaced IDs and icon/picker/preview profiles. Only picture `src`
   is registered, never compositor masks/base images by accident.
2. **Generate bounded derivatives.** `scripts/thumbnails/engine.mjs` uses installed
   Sharp with two workers, quality 85, sRGB normalization, EXIF rotation,
   transparency preservation, a 50-million-pixel ceiling, and no upscaling.
   Icon widths are 80/160/320; picker widths 160/320/640; preview widths
   160/320/640/960. Shared sources/settings use the union of requested widths.
   Validate IDs, profiles, source containment, format, animation, and quality.
   Vectors have a separate manifest kind and validated hashed passthrough URL.
3. **Separate conversion identity from URL identity.** Conversion cache keys
   include source bytes, settings, requested widths, and Sharp/encoder versions.
   URLs hash actual output bytes and record actual dimensions. Verify cached
   output hashes before reuse, repairing missing or corrupted files.
4. **Publish safely.** Conversion passes take a bounded writer lock with dead
   process recovery. Atomic file replacement publishes the complete manifest
   last. All workers finish before releasing the lock on failure. Keep old
   derivatives during development so active tabs retain working URLs; do not
   prune during watch. Ignore derivatives and cache, but **commit the manifest**
   so clean-checkout TypeScript and component tests can resolve it immediately.
5. **Render responsively.** `StaticThumbnail` emits static `img` srcset/sizes and
   reserved dimensions, supports intrinsic/fill layouts, preserves existing
   transforms and containment, defaults to lazy loading, and permits explicit
   priority. Unknown IDs/source lookups fail visibly. Keep original fields in
   prompt configuration and API requests. Keep Next's global optimizer setting.
6. **Automate both entry points.** `npm run dev` generates first, then launches
   Next with forwarded arguments; `run.sh` goes through the same launcher.
   Watch registered sources and relative catalog/generator dependencies, debounce
   changes, refresh dependency watches, coalesce queued passes, and stop child
   processes together. Subsequent failures retain the last valid manifest and
   report an error; missing newly registered files are watched for recovery.
   `npm run build` generates before Prisma/Next. Build/dev require dev dependencies
   (tsx and TypeScript), as the existing toolchain does.
7. **Cache static delivery.** Production `/thumbnails/*` responses get
   `public, max-age=31536000, immutable`. Development keeps normal refresh
   behavior. New output bytes mean new URLs; caching depends on browser/CDN
   retention. A deployment only contains its current generated files, so an old
   open tab across deployments may need refreshing; there is no permanent
   cross-deployment archive guarantee. Exclude derivatives from API traces and
   verify required original reference assets remain present.
8. **Support future flows deliberately.** New entries in registered metadata are
   automatic. A completely new flow must register its metadata once and use the
   shared component. Typed IDs, strict lookups, generator validation, a contributor
   checklist, and explicit inventory provide coverage; avoid creating bespoke
   lint infrastructure or claiming that arbitrary future images are automatic.

## Adversarial review corrections incorporated

The OpenCode DeepSeek review and triage are in
`../reviews/2026-10-06-thumbnail-plan-adversarial-review.md`.

- Commit the manifest; ignore only outputs/cache.
- Cover `run.sh`, argument forwarding, child cleanup, and clean builds.
- Namespace IDs and derive registration from shared, React-free metadata.
- Retain old URLs during watch; no automatic pruning.
- Hash actual output and verify cache integrity, including encoder identity.
- Test concurrent writers, dead-holder recovery, and failure-safe publication.
- Cover review previews and instruction guides as well as picker cards.
- Measure real browser responses and inspect diamond detail at mobile/desktop.
- Use a discriminated raster/vector manifest with actual rotated dimensions.
- Preserve existing API tracing exclusions and original model attachments.

## Acceptance and delivery

- Generator tests: alpha, dimensions, no upscale, EXIF rotation, invalid paths,
  duplicate IDs, corrupt input/cache, shared-source reuse, source/settings
  invalidation, concurrent/dead writers, vectors, and check-mode manifest drift.
- Component tests: responsive URLs, vector behavior, priority, transforms, and
  unknown registration failures. Existing customer flow tests remain passing.
- Clean production build without output/cache; repeat generation reuses outputs.
- Watch integration: new source, changed source, temporarily missing source,
  recovery, port forwarding, and process shutdown.
- Browser smoke through all migrated routes on mobile and desktop; select a
  grillz style and advance to its review; inspect screenshots and transfer bytes.
- Inspect API trace paths and production static cache headers.
- Document registration and caching in `docs/static-thumbnails.md`.

No database schema, prompt, original image, upload storage, or image-generation
pipeline changes are required.
