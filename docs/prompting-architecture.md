# Prompting Architecture

This document explains name and logo pendant prompting, Grillz generation, and how reference images are attached to generation requests.

## Logo Pendant Flow

The Logo builder at `/pendants/logo` (also available under `/s/:slug/design/pendants/logo`) posts to `/api/logo-requests`.

- `src/lib/logo-pendants/pendant.prompt` owns the editable natural-language prompt. `snippets.yml` owns the shape clauses and optional About logo context.
- The strict template renderer fills `SHAPE_CLAUSE`, `METAL_COLOR`, and `ADDITIONAL_TEXT_INSTRUCTION`. Custom has an empty shape clause; no shape wording or shape example is included. Circle, Shield, Hexa, and Diamond use their selected silhouette in the prompt.
- The prompt always requests VVS natural diamonds, micro pavé detailing, a flat pendant, and a centered top down shot on black suede. Stone type, diamond quality, metal type, and size selections are saved as request/quote metadata. The selected gold color combination controls prompt color.
- `src/lib/logo-pendants/assets.yml` maps each selected shape to a pendant example in `public/logo-pendants/references/`. The shared connector sends the uploaded logo first and the selected example second. Custom sends only the logo. Hexa maps to the hexagon reference. Reference selection depends on shape; the customer’s metal choices remain prompt variables. Shape picker thumbnails remain separate UI assets.
- Browser uploads use the existing signed direct R2 upload flow (`logo-pendant` purpose), with multipart fallback when direct upload is unavailable. The API validates and decodes images before generation, normalizes them into a temporary PNG, and removes that temporary file after success or failure.
- Two pending `Result` rows store the exact rendered prompt and attachment paths. Both models run in parallel through the shared connector: variant 1 uses Gemini Pro at 2K and variant 2 uses Gemini Flash at 1K, both at 9:16. Each success consumes an image usage credit, while owner signup credits still cover the full Generate click through the shared service. Shared temporary logo files remain available until both attempts settle. Polling displays results progressively and waits for both attempts; older single-draft logo requests retain their original completion behavior.
- Account and QR attribution, owner signup credits, paid usage checks, contact capture, automatic draft quotes, and owner alerts use the existing shared services. Existing Request fields hold logo choices, so no database migration is required.
- Loading/contact is a separate screen using the same `LeadCaptureModal` / `CustomerLeadCaptureScreen` as iced-out name pendants. Submitting contact reveals the shared `CustomerResultsScreen`, with selection, preview, download, and up to two image revisions through the existing request revision APIs. Generation continues polling while contact is captured.

The Next.js output tracing include for `/api/logo-requests` bundles the editable `.prompt` and `.yml` files and the shape reference images for production.

## Name Pendant Flow

The customer-facing name pendant builder calls `buildVariants()` in `src/lib/styles/builder.ts`.

For each request, the builder:

1. Validates customer selections.
2. Loads the selected style config from `src/lib/styles/<style-id>/style.yml`.
3. Loads the configured prompt template:
   - JSON prompt templates use `<templateKey>.jsonp`.
   - Natural language prompt templates use `<naturalLanguageTemplateKey>.prompt`.
4. Injects runtime values such as pendant text, metal colors, emblem choice, style defaults, and variant settings.
5. Builds two variants.
6. Adds reference image attachments:
   - the style pendant reference from `assets.pendantRef`
   - or multiple equal style references from `assets.pendantRefs`
   - or the selected primary-metal reference from `assets.pendantRefsByMetal`
   - optional color-aware iced-out emblem reference, falling back to `assets.emblemRefs`
   - optional typography reference descriptor from `fontReference`

The image connector in `src/lib/styles/connector.ts` resolves generated typography descriptors into PNG files before sending attachments to the provider.

## Style Config

Each iced-out style lives in:

```txt
src/lib/styles/<style-id>/style.yml
```

Important fields:

| Field | Purpose |
| --- | --- |
| `id` | Internal style id used in requests and data. |
| `label` | Display label for the style. |
| `templateKey` | Base prompt template name. |
| `naturalLanguageTemplateKey` | Optional natural-language prompt template. |
| `naturalLanguageSnippetsKey` | Optional YAML snippets for natural-language prompts. |
| `emblemsAllowed` | Supported emblem options. |
| `fontReference` | Optional font used to render a typography image attachment. |
| `defaults` | Style defaults such as all-caps, view, and deviation strength. |
| `variantMatrix` | Per-variant overrides. |
| `assets.pendantRef` | Main visual style reference image. |
| `assets.pendantRefs` | Multiple equal visual style reference images. Used when a style needs more than one pendant reference attached. |
| `assets.pendantRefsByMetal` | Optional primary-metal keyed visual references for styles with separate rose, white, and yellow gold assets. |
| `assets.emblemRefs` | Optional visual emblem references. |

## Typography Reference Attachments

Typography references are generated without changing prompt templates.

When a style config has `fontReference`, `buildVariants()` adds a small descriptor file to the attachment list. The descriptor is not sent directly to the provider. Right before provider submission, `src/lib/styles/text-reference.ts` renders it into a PNG using:

- Playwright/Chromium canvas as the default renderer.
- `opentype.js` in the browser context to draw font glyphs directly onto the canvas.
- a legacy `opentype.js -> SVG path -> sharp` fallback if browser rendering fails or `TEXT_REFERENCE_RENDERER=svg-path` is set.

The PNG is cached in the OS temp directory:

```txt
/tmp/flawless-style-text-references/
```

This keeps generated helper images out of the repo, avoids durable storage bloat, and reuses the same rendered PNG when the same style/font/text combination is requested again.

Browser-canvas rendering is used because some decorative fonts, including Cristone and Campana Script, render incorrectly when serialized through `Path.toPathData()` and then rasterized as SVG paths. Direct canvas drawing matches the behavior of the opentype.js font inspector more closely.

The customer review step calls `/api/text-reference/prewarm` for iced-out styles. This warms the Playwright browser and renders the exact selected style/text before the customer clicks `accept`, so provider submission can reuse the cached PNG.

Styles without `fontReference` do not attach typography references. `pooh` intentionally has no text-rendering attachment and relies on its pendant reference images plus the selected color-aware emblem.

### Production Hosting Notes

Playwright works well for local development and Node hosts that allow a bundled Chromium runtime. On Vercel serverless, this should be tested in preview with real generation traffic because browser binaries increase bundle/runtime cost and cold-start risk. If preview shows slow cold starts, missing browser binaries, or memory pressure, keep the same descriptor API but move `renderTextReferenceDescriptor()` to a small Node worker service on Render/Railway/Fly and call it before provider submission.

## Iced-Out Emblem References

Iced-out name pendants use color-aware emblem attachments without changing prompt wording. The builder chooses an emblem image from:

```txt
public/emblems/colored/
```

Files use this convention:

```txt
<emblem>-<metal>.png
```

Examples:

- `butterfly-rose-gold.png`
- `crown-yellow-gold.png`
- `heart-white-gold.png`

For two-tone requests, the emblem reference follows `primaryMetal`. For example, Rose Gold + White Gold uses a rose-gold emblem reference. If a colored emblem file is missing, the builder falls back to the selected style's existing `assets.emblemRefs` entry.

## Iced-Out Font Mapping

All font files are stored under:

```txt
public/style-fonts/<style-id>/
```

Current mapping:

| Style id | Display style | Font family | Font file |
| --- | --- | --- | --- |
| `neiko` | Neiko | Milky Casuals | `public/style-fonts/neiko/Milky-Casuals.otf` |
| `jaida` | Jaida | Great Vibes | `public/style-fonts/jaida/GreatVibes-Regular.ttf` |
| `samoa` | Samoa | Cristone | `public/style-fonts/samoa/Cristone.ttf` |
| `deja` | Mojo | Campana Script | `public/style-fonts/deja/CampanaScript.otf` |
| `jhon` | Jhon | Carnivalee Freakshow | `public/style-fonts/jhon/Carnivalee-Freakshow.ttf` |
| `jwae` | Jwae | Break Brush | `public/style-fonts/jwae/Break-Brush.ttf` |
| `gatti` | Hasan | Magnolia Script | `public/style-fonts/gatti/Magnolia-Script.otf` |
| `king` | MANA | Helvetica Neue Black Italic | `public/style-fonts/king/Helvetica-Neue-Black-Italic.ttf` |
| `lexy` | Lexy | Birds of Paradise | `public/style-fonts/lexy/Birds-of-Paradise.ttf` |
| `pooh` | Pooh | none | no typography reference attached |

`king` uses `transform: uppercase` because the MANA style is forced all-caps.

## Prompt Modes

The app supports two name prompt modes:

- `json`
- `natural_language`

The fallback mode is controlled by `NAME_PROMPT_MODE`.
Owner/account settings can override the mode via `AppSetting`.

Styles that do not define `naturalLanguageTemplateKey` continue to use their JSON prompt template even when natural language mode is requested.

## Provider Attachment Boundary

`src/lib/styles/connector.ts` is the boundary between prompt building and provider submission.

It prepares all attachments before provider calls:

1. Normal image paths pass through unchanged.
2. `.style-text-reference.json` descriptors are rendered into PNG files.
3. The provider reads all final file paths and sends them as inline image data.

This lets style config add typography references without changing each prompt template.

## Safe Editing Rules

- Update prompt wording only in the relevant `.prompt` or `.jsonp` file.
- Update font attachment behavior through `fontReference` in `style.yml`.
- Update colored iced-out emblem assets under `public/emblems/colored/`; keep `assets.emblemRefs` as generic fallbacks.
- Keep font mappings documented in this file whenever a style font changes.
- Keep generated typography PNGs temporary; do not commit rendered text-reference outputs.

## Grillz Flow

`app/grillz/GrillzBuilder.tsx` serves `/grillz` and the Account-scoped
`/s/:slug/design/grillz` route. Customers choose a style, upper/lower teeth, gold
color, stone type, and VS/VVS quality before generating one image. Selecting a
style card advances directly to customization. Changing choices invalidates the
current draft so its request metadata stays consistent.

`src/lib/grillz/config.ts` owns the shared style IDs, labels, descriptions, and
preview paths. To add a preset, add its ID to `GrillzStyleId`, add a
`GRILLZ_STYLES` entry, and put its original preview under `public/grillz/styles/`.
The picker and API allowlist derive from that metadata. The thumbnail catalog
already registers Grillz styles: run `npm run thumbnails` and commit the updated
manifest. Preset descriptions and previews are not model inputs.

`POST /api/grillz-requests` validates the choices, resolves Account and QR
attribution, checks usage, and renders `grillz-product-photo.prompt` through
`buildGrillzPrompt`. The prompt contains the style label, selected teeth, gold
color, stone type, diamond quality, and any inspiration text. Presets send only
that prompt. Custom requires an uploaded inspiration image, which is passed as
an attachment and removed from temporary storage after generation settles.

A pending `Result` stores the exact prompt. Background generation uses the
shared connector and `scheduleBackgroundTask` (`waitUntil` on Vercel), records
success or failure, and meters successful output. The browser polls
`GET /api/requests/:id` every two seconds and captures customer contact through
the shared lead screen. Successful output plus contact creates an automatic
private quote draft. The customer quote button calls the existing idempotent
`/api/quote-requests` endpoint and shows pending, success, or retryable error
feedback; it does not price or publish the quote.

New presets: Luxury Silver, Gold Silver, Rose Gold, Rainbow Gemstone,
Iced Diamond, and Gold Hearts. Material names in style labels describe the
preview; the separate customer material choices still control the prompt.
