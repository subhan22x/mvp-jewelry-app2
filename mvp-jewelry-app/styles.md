# Styles Prompting System

Last updated: 2026-05-01

This file captures the current style/prompting context for the jewelry image generation system. It is meant as a quick reference before changing prompts, style YAML, model routing, tests, or the internal review tool.

## Core Files

- `src/lib/styles/_types.ts`: TypeScript shape for styles, variants, customer input, and built prompts.
- `src/lib/styles/builder.ts`: Reads a style, merges variant settings, applies text/caps/color/emblem variables, and renders the prompt template.
- `src/lib/styles/registry.ts`: Finds `style.yml` and the matching `.jsonp` template for a style id.
- `src/lib/styles/utils.ts`: Performs simple `{{PLACEHOLDER}}` replacement.
- `src/lib/styles/connector.ts`: Sends rendered prompts and attachments to the selected image provider, saves generated files, and applies a generation timeout.
- `src/lib/providers/index.ts`: Maps variant number to the actual model.
- `src/lib/styles/__tests__/builder.test.ts`: Prompt-builder regression tests.
- `app/internal/generations/page.tsx`: Internal analysis grid for reviewing generated images, prompts, models, durations, and errors.

## Style Folder Format

Each style lives in `src/lib/styles/<styleId>/` and normally has:

- `style.yml`: Human-editable config for defaults, variant matrix, allowed emblems, and reference assets.
- `<templateKey>.jsonp`: Prompt template loaded by `templateKey` from the YAML.

Current style folders:

- `deja`
- `gatti`
- `jaida`
- `jhon`
- `jwae`
- `king`
- `lexy`
- `neiko`

Important convention: `.jsonp` means "prompt template", not necessarily valid JSON. Some templates render to JSON prompts, but `king` intentionally renders to plain prose. Do not assume all style prompts can be `JSON.parse`-ed.

## Builder Flow

`buildVariants(input)` currently creates exactly two variants for every style:

- Variant 1: better/pro draft.
- Variant 2: cheaper/fast draft.

The builder does this:

- Validates `userId`, `styleId`, `text`, `twoTone`, metals, and `emblem`.
- Loads `style.yml` through `getStyle(styleId)`.
- Loads the `.jsonp` template named by `templateKey`.
- Splits user text on newlines, trims blank lines, and preserves one or two lines as needed.
- Reads the style variant config for variant 1 and variant 2.
- Merges variant overrides with style defaults.
- Applies all-caps only when `forceAllCaps` resolves to `true`.
- Builds color strings from the metal inputs.
- Collects attachments from the pendant reference, bail reference, and selected emblem reference.
- Renders the prompt template by replacing `{{PLACEHOLDER}}` tokens.

## Placeholder Context

These placeholders are currently supplied by `builder.ts`:

- `{{TEXT}}`: Final rendered text lines joined with a space. This respects caps rules.
- `{{LINES_ARRAY}}`: JSON stringified array of final text lines, for example `["Alyssa"]`. This is currently an array of strings, not an array of `{ content, case }` objects.
- `{{DEVIATION}}`: Variant deviation strength after merging YAML defaults and overrides.
- `{{PENDANT_REF}}`: Basename of the pendant reference file, or fallback text.
- `{{BAIL_REF}}`: Basename of the bail reference file, or fallback text.
- `{{FONT}}`: `defaults.font` from YAML, or `inherit_source_style`.
- `{{EMBLEM}}`: Selected emblem id, such as `butterfly`, `crown`, or `none`.
- `{{SCHEME_TYPE}}`: `two_tone` or `single_tone`.
- `{{PRIMARY_METAL}}`: Primary metal id.
- `{{SECONDARY_METAL}}`: Secondary metal id. For single-tone requests this mirrors the primary metal.
- `{{COLOR_SCHEME}}`: Human-readable color string, for example `two_tone rose_gold + white_gold`.
- `{{CAPS_POLICY}}`: `forced_all_caps` or `as_typed`.
- `{{BUBBLE_OUTLINE}}`: Boolean rendered as `true` or `false`.
- `{{BUBBLE_OUTLINE_ENABLED}}`: Same boolean as `BUBBLE_OUTLINE`, kept for templates that use the longer name.
- `{{VIEW}}`: View string from style defaults.

Template rule of thumb:

- Put numeric and boolean placeholders unquoted inside JSON templates.
- Put string placeholders in quotes inside JSON templates.
- If a style does not use a concept, such as bubble outline or deviation, leave the placeholder out of the template rather than forcing it.

## Assets And Attachments

The YAML `assets` block controls which local reference files are attached to generation calls:

- `pendantRef`: Main style reference image, usually `public/pendants/<style>.png`.
- `bailRef`: Optional separate bail reference. Most current styles do not set this.
- `emblemRefs`: Optional emblem reference images keyed by emblem id.

Current styles generally attach:

- The style pendant reference.
- The selected emblem reference when `emblem` is not `none`.

The prompt template receives `{{PENDANT_REF}}` and `{{BAIL_REF}}` as text placeholders, but the actual image files are passed separately as attachments through `connector.ts`.

## Model Routing

Do not put model ids in `style.yml`. Model selection is separate from prompt shape.

Current model mapping in `src/lib/providers/index.ts`:

- Variant 1 uses `gemini-3-pro-image-preview` with `imageSize: "2K"` and `aspectRatio: "9:16"`.
- Variant 2 uses `gemini-3.1-flash-image-preview` with `imageSize: "1K"`.

The connector calls `resolveGenerationConfig(variant)` and passes the returned `modelId` and optional `imageSize` to the provider.

Name variant 1 prompts also get explicit 9:16 language:

- JSON-style prompts receive a top-level `composition_control` object.
- Prose prompts receive the same instruction appended as text.
- Instruction: `Render the final product photo in a vertical 9:16 composition. Keep the full pendant and bail visible with clean margins.`

## Current Variant Pattern

The current general two-variant pattern is:

- Better/pro model: as typed, no bubble outline, lower deviation.
- Cheaper/fast model: as typed, bubble outline, higher deviation.

Older history: the previous four-variant system was a 2x2 matrix of text casing and bubble outline:

- As typed + bubble outline + low deviation.
- As typed + no bubble outline + low/mid deviation.
- All caps + bubble outline + higher deviation.
- All caps + no bubble outline + highest deviation.

We flattened that old structure to two variants. Style-specific exceptions are listed below.

## Current Style Notes

| Style | Prompt shape | Font | Variant 1 | Variant 2 | Caps |
| --- | --- | --- | --- | --- | --- |
| `deja` | Rich JSON-style pendant prompt | `CC Matinee Idol` | deviation `0.40`, no bubble | deviation `0.60`, bubble | as typed |
| `gatti` | Older rich JSON-style prompt | template-specific | deviation `0.30`, no bubble | deviation `0.50`, bubble | as typed |
| `jaida` | Lexy-like rich JSON-style pendant prompt | `Great Vibes` | deviation `0.30`, no bubble | deviation `0.50`, bubble | as typed |
| `jhon` | Rich JSON-style pendant prompt | `Carnivalee Freakshow` | deviation `0.50`, no bubble | deviation `0.70`, no bubble | as typed |
| `jwae` | Compact JSON-style prompt | template-specific | deviation `0.30`, no bubble | deviation `0.50`, bubble | as typed |
| `king` | Plain prose prompt | `Helvetica Black SLANTED` | model switch only | model switch only | forced all caps |
| `lexy` | Rich JSON-style pendant prompt | `inherit_source_style` unless YAML sets font | deviation `0.30`, no bubble | deviation `0.50`, bubble | as typed |
| `neiko` | Compact JSON-style prompt | template-specific | deviation `0.30`, no bubble | deviation `0.50`, bubble | as typed |

## Style-Specific Details

### Deja

- User-specified font is `CC Matinee Idol`.
- Better/pro model uses deviation `0.40` and no bubble outline.
- Cheaper/fast model uses deviation `0.60` and bubble outline.
- Text stays as typed.
- Current tests parse Deja prompt JSON and assert the font, deviations, bubble settings, and text array.

### Jaida

- Prompt structure should stay similar to Lexy.
- User-specified font is `Great Vibes`.
- Better/pro model uses deviation `0.30` and no bubble outline.
- Cheaper/fast model uses deviation `0.50` and bubble outline.
- Text stays as typed.

### Jhon

- User-specified font is `Carnivalee Freakshow`.
- Better/pro model uses deviation `0.50`.
- Cheaper/fast model uses deviation `0.70`.
- No bubble outline on either version.
- Text stays as typed.
- This prompt came from an internal tool style with the same basic variables as the other rich JSON-style prompts.

### King

- King is intentionally different from the rich JSON prompt family.
- The prompt is plain prose, not JSON.
- It uses only the model switch between variants.
- It should force capslock through `forceAllCaps: true`.
- User-specified/default font is `Helvetica Black SLANTED`.
- Do not add deviation or bubble outline language unless the desired King prompt changes.

### Lexy

- Lexy is the reference for the richer JSON-style prompt structure that Jaida was made to resemble.
- It uses `{{FONT}}`, so it falls back to `inherit_source_style` unless a font is set in YAML.

## Prompt Family Similarities

The rich JSON-style prompts generally share these sections:

- `role`, `version`, and `purpose`.
- `style_control` with `inherit_from_source` and `deviation_strength`.
- `source_images` for pendant and bail references.
- `pendant.materials` describing gold, diamond pave, and stone density.
- `pendant.text` with user text, max lines, font, kerning, thickness, outline, and physical connection rules.
- `pendant.Emblem` with emblem type, reference usage, placement, scale, color sync, and support/physics notes.
- `colorway` for scheme and metals.
- Optional `text_bubble_outline` for the heavy outline/perimeter rim.
- `layout_constraints`, `realism`, `background`, `rendering`, `output`, and `failure_modes_and_fixes`.

Not every style has all sections. Keep style-specific prompt personality where it matters.

## Picture Pendant Styles

Picture Pendants are intentionally separate from Name styles.

- UI catalog and compositor asset map: `data/picture-pendant-styles.json`.
- App import shims: `lib/picture-styles/*`, matching the existing Name style shim pattern.
- Deterministic compositor: `src/lib/picture-styles/compositor.ts`.
- Catalog resolver: `src/lib/picture-styles/catalog.ts`.
- API route: `/api/picture-requests`.

Current Picture Pendant behavior:

- One generation only.
- Uses deterministic Sharp compositing instead of a GenAI image model.
- Saves the result as `variant: 1` with `modelId: sharp-green-mask-composite-v1`.
- Uses single-tone gold only: `yellow_gold`, `white_gold`, or `rose_gold`.
- No text input, uppercase, emblems, color combos, or diamond quality.
- Uploaded customer images are temporary server files only. They are composited locally and deleted after the async attempt settles.
- There is no generic fallback prompt or AI fallback. Missing style config should fail clearly.
- A Picture style is selectable in the UI only when its catalog entry has `available: true`.

Seed images currently live in `public/picture-pendants/`:

- Plain `.jpg` files are thumbnails and the base frame used for compositing.
- `_green.jpg` files mark the exact image placement area.

V1 compositing method:

- Detect green pixels in the selected `_green.jpg` using a threshold.
- Build an alpha mask from that green area.
- Resize/crop the uploaded customer image to cover the mask bounds.
- Replace the uploaded image alpha with the detected mask.
- Composite the clipped upload onto the matching plain pendant image.
- Save the final PNG to `public/generated/`.

Important limitation:

- The selected gold color is stored on the request, but v1 preserves the frame color from the seed image. To recolor metal reliably, add separate metal masks or separate seed images per metal color.

## Data And Internal Analysis

Generated outputs are stored in two places:

- Images are written to `public/generated/`.
- Generation metadata is stored in Prisma, including prompt text and fields such as model id, status, error, start/completion time, and duration.
- Requests include `productType`, so internal review can distinguish `name` and `picture` generations.
- Video generations are stored in Prisma in `VideoGeneration`. They reference the parent request, the source high-quality result, the public source image URL sent to Wavespeed, the exact video prompt, Wavespeed job id, video URL, model id, status, error, and duration.
- Quote handoffs are stored in Prisma in `QuoteRequest`. A quote request snapshots the designed image URL, optional generated video URL, generation timestamp, product/style/text/metals/emblem/diamond choices, and customer name/phone/email.

The internal review page is available at:

- `/internal/generations`

That page is meant for analyzing generated images alongside prompts. It shows images in a grid and prompts in collapsible small-font panels.

It also shows recent quote requests so the designed image, generated video link, customer contact, and design choices are visible before a dedicated admin dashboard exists.

Prisma Studio is useful for raw database inspection when it is running at:

- `http://localhost:5555`

To inspect the last prompt manually, look at recent `Result` rows and sort by the newest request/result timestamp. The rendered prompt is saved in `Result.prompt`.

## Video Generation

Name pendant results can generate a Seedance video after image generation finishes.

Current behavior:

- The result-screen `continue` button is replaced with a red `Generate Video` button.
- The bottom-left result action is now `home`. It confirms that generated drafts/video progress will be lost before routing to `/`.
- Video generation always uses the better model image, `variant: 1`, regardless of which draft tile is selected.
- After a video succeeds, the customer-facing action is `get a quote`, not `open video`.
- Clicking `get a quote` writes a `QuoteRequest` row and shows the banner: `your Design has been sent! We will reach back soon through email or test`.
- Access is gated by `VIDEO_ACCESS_CODE`. The current local access code is `ID8`.
- The Wavespeed API key is read from `WAVESPEED_API_KEY`.
- The Seedance endpoint is `bytedance/seedance-2.0/image-to-video`.
- Default duration is `7` seconds via `VIDEO_DURATION_SECONDS`.
- Default resolution is `720p` via `VIDEO_RESOLUTION`; supported values are `480p`, `720p`, and `1080p`.
- Audio defaults off unless `VIDEO_GENERATE_AUDIO=true`.
- The video prompt is read from `VIDEO_PROMPT` when configured. Until the final prompt is supplied, the code falls back to a conservative jewelry product-video prompt.

Important Wavespeed URL requirement:

- Wavespeed requires a public image URL, not a local filesystem path.
- The app builds that URL from the generated image path plus `APP_BASE_URL` or `NEXT_PUBLIC_APP_URL`.
- For local development, use a public tunnel or deployed URL for `APP_BASE_URL`; plain `localhost` generally will not be fetchable by Wavespeed.

Relevant files:

- UI: `app/name/page.tsx`.
- Submit route: `app/api/videos/route.ts`.
- Poll route: `app/api/videos/[id]/route.ts`.
- Quote route: `app/api/quote-requests/route.ts`.
- Provider client: `src/lib/video/wavespeed.ts`.
- Prisma model: `VideoGeneration`.

## Quote Requests

Quote requests are the future admin-dashboard bridge between customer ideation and store-owner pricing.

Current behavior:

- The lead modal collects customer name, phone, and email after the image request is created.
- The video screen `get a quote` button posts to `/api/quote-requests`.
- The API reconstructs stable generation choices from Prisma instead of trusting the browser for product/style/text/metal/emblem choices.
- `diamondQuality` is currently captured from UI state because the original `Request` table does not store it.
- The designed image uses the better model image, `Result.variant = 1`, when available.
- The quote can also store the generated `videoUrl` when a video exists.
- Newly created quote rows start with `status: pending`.

Prisma model:

- `QuoteRequest`

Fields captured for admin use:

- Designed image URL and optional video URL.
- Generation timestamp.
- Product type, style id, text, metal selection, emblem, and diamond quality.
- Customer name, phone, and email.
- Future pricing fields: `quotedPriceCents`, `quoteNotes`, and `status`.

## Render Deployment Notes

Render MVP deployment uses the local SQLite app architecture with a persistent disk:

- `render.yaml` defines a web service rooted at `mvp-jewelry-app`.
- The persistent disk mounts at `/var/data`.
- `DATABASE_URL=file:/var/data/dev.db` stores SQLite on that disk.
- `GENERATED_IMAGE_DIR=/var/data/generated` stores generated images on that disk.
- `npm run start` runs `prisma migrate deploy`, seeds the demo user, then starts Next.
- `/generated/:file` is handled by `app/generated/[file]/route.ts`, so generated files can live outside `public/generated`.

This is meant as the quick internal MVP path. For heavier production usage, migrate Prisma to Postgres and move generated files to object storage.

## Testing Notes

When changing prompt behavior, update or add tests in `src/lib/styles/__tests__/builder.test.ts`.

Recommended assertions:

- Number of variants is `2`.
- Expected model-specific prompt variables are different between variant 1 and 2.
- Font is correct for style-specific font prompts.
- Text casing behavior is correct.
- Bubble outline behavior is correct.
- Deviation values are correct.
- Prose styles like `king` should be tested as raw strings, not parsed as JSON.

Do not add JSON parsing tests for a style unless that style is intended to render valid JSON.

## Cautions

- Do not reintroduce the old four-variant prompt matrix unless the product decision changes.
- Do not move model routing into style templates or YAML.
- Do not force caps globally; only styles like `king` should force all caps.
- Do not force bubble outline globally; style variants decide it, and some styles intentionally do not use it.
- Be careful with `{{LINES_ARRAY}}`: current builder output is an array of strings. If templates need object entries like `{ "content": "...", "case": "as-is" }`, the builder needs a deliberate change.
- Keep generated images and Prisma prompt records in sync by relying on the connector flow rather than writing generated files manually.
- Treat existing generated images as analysis data, not source-code fixtures, unless a test explicitly depends on them.
