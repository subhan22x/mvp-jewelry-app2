# Prompting Architecture

This document explains how name pendant prompting currently works and how typography reference images are attached to generation requests.

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
| `assets.emblemRefs` | Optional visual emblem references. |

## Typography Reference Attachments

Typography references are generated without changing prompt templates.

When a style config has `fontReference`, `buildVariants()` adds a small descriptor file to the attachment list. The descriptor is not sent directly to the provider. Right before provider submission, `src/lib/styles/text-reference.ts` renders it into a PNG using:

- `opentype.js` to convert font glyphs into SVG path geometry
- `sharp` to rasterize the SVG into a PNG

The PNG is cached in the OS temp directory:

```txt
/tmp/flawless-style-text-references/
```

This keeps generated helper images out of the repo, avoids durable storage bloat, and reuses the same rendered PNG when the same style/font/text combination is requested again.

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
