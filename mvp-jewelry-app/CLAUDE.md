# CLAUDE.md — agent guide

This file is for coding agents (and humans designing changes). It explains the architecture, the conventions to preserve, and the things not to do.

The product itself is documented in `README.md`. Read that first.

## Mental model

The system has four editable surfaces, in increasing volatility:

| Surface         | Files                              | Edited |
| --------------- | ---------------------------------- | ------ |
| TypeScript code | `app/`, `src/lib/styles/*.ts`      | Rarely |
| Prisma schema   | `prisma/schema.prisma`             | Rarely |
| Style config    | `src/lib/styles/<style>/style.yml` | Often  |
| Prompt text     | `src/lib/styles/<style>/*.jsonp`   | Very often |

The user iterates on prompts daily. Code stays stable; YAML and `.jsonp` files are the editable surface. **Never** put long prompt text inside a `.ts` file, and **never** introduce a `switch` over `styleId` inside an API route or builder.

## Data flow

```
React UI (app/name/page.tsx)
  └─ POST /api/requests {userId, styleId, text, twoTone, primaryMetal, secondaryMetal, emblem}
      ├─ Zod validates body
      ├─ prisma.request.create(...)
      ├─ buildVariants(input)           src/lib/styles/builder.ts
      │     ├─ getStyle(styleId)        loads style.yml
      │     ├─ getTemplatePath(...)     locates the .jsonp
      │     ├─ for each of 4 variants:
      │     │   merge style.defaults + variantMatrix[i]
      │     │   apply forceAllCaps to text
      │     │   render placeholders into the template
      │     │   resolve attachment paths (pendantRef, bailRef, emblemRef)
      │     └─ return BuiltVariant[]    {variant, prompt, attachments}
      ├─ fires void Promise.all(4 × generateImage + prisma.result.create)  ← async, not awaited
      └─ returns {requestId} immediately (~100 ms)

  (generation runs in the background — each variant writes its Result row when done)

  UI polls GET /api/requests/{requestId} every 2 s
      └─ returns {results: [...], done: boolean}
          └─ UI updates tiles progressively; stops polling when done === true
```

**Vercel production note:** `void Promise.all(...)` keeps tasks running in dev, but a Vercel Lambda may terminate after the response is sent. Replace with `waitUntil(Promise.all(...))` from `@vercel/functions` before deploying.

## Customer choices vs style internals

The customer controls only:

- text
- styleId
- gold finish (mapped to `twoTone` + `primaryMetal` + `secondaryMetal`)
- emblem
- diamondQuality (collected in UI but not yet sent to backend — see roadmap)

Everything else — `deviationStrength`, `bubbleOutline`, `forceAllCaps`, `view`, prompt wording, reference images — is owned by the style system. **Never expose those as UI controls.** They exist so each style can produce four diverse-but-on-style variants without the customer prompt-engineering anything.

## The four variants

Each style's `variantMatrix` defines exactly four entries; `buildVariants` iterates 1–4 and merges each entry over the style's `defaults`. This is the deliberate source of variety — same text, same style, four reasonable interpretations.

## Adding a new style

1. Create `src/lib/styles/<style>/style.yml`:
   ```yaml
   id: <style>
   label: <Display Name>
   templateKey: block_baguette_v1   # or whichever family fits
   emblemsAllowed: [none, crown, heart, spade, butterfly, moneybag]

   defaults:
     bubbleOutline: true
     forceAllCaps: false
     deviationStrength: 0.30
     view: front_view

   variantMatrix:
     - { deviationStrength: 0.25, bubbleOutline: true,  forceAllCaps: false }
     - { deviationStrength: 0.30, bubbleOutline: false, forceAllCaps: false }
     - { deviationStrength: 0.40, bubbleOutline: true,  forceAllCaps: true  }
     - { deviationStrength: 0.60, bubbleOutline: false, forceAllCaps: true  }

   assets:
     pendantRef: public/pendants/<style>.png
     emblemRefs:
       crown: public/emblems/CROWN EMBLEM.png
       heart: public/emblems/heart emblem.png
       spade: public/emblems/SPADE EMBLEM.png
       butterfly: public/emblems/BUTTERFLY EMBLEM.png
       moneybag: public/emblems/moneybag emblem.png
   ```
2. Either point `templateKey` at an existing template family, or drop a local override at `src/lib/styles/<style>/template.jsonp` (see "Template families" below).
3. Add the style to `data/pendant-styles.json` so it appears in the UI picker.
4. Add a thumbnail at `public/pendants/<style>.png`.

## Template families and overrides

**Target convention** (planned, see roadmap):

```
src/lib/styles/
  _templates/
    script_bubble_v1.jsonp
    script_pave_v1.jsonp
    block_baguette_v1.jsonp
  <style>/style.yml
  <style>/template.jsonp     # optional local override
```

Resolution rule:

1. If `src/lib/styles/<style>/template.jsonp` exists, use it.
2. Otherwise use `src/lib/styles/_templates/<templateKey>.jsonp`.

**Today's reality:** every style has its own `block_baguette_v1.jsonp`, even when the content is actually a script-bubble prompt (Lexy is the clearest example — name says block-baguette, content is detailed script-bubble). Migrating to the shared `_templates/` layout is a known cleanup task. Until that is done, edits go in the per-style file.

When you do migrate, do **not** copy the same long prompt into eight folders. Pull common prompts up into `_templates/`; keep per-style overrides only when a style genuinely needs different wording.

Suggested family assignments (post-migration):

| Style                    | Family                    |
| ------------------------ | ------------------------- |
| lexy                     | `script_bubble_v1`        |
| king, jhon               | `block_baguette_v1`       |
| deja, gatti, jaida, jwae, neiko | TBD after visual review |

## Placeholders available to templates

`src/lib/styles/utils.ts:renderTemplate` is **strict** — every `{{PLACEHOLDER}}` must be supplied or it throws. Keep that strictness. Available placeholders today:

```
TEXT                  joined input lines, single string
LINES_ARRAY           JSON-stringified array of lines
DEVIATION             number, 0..1
PENDANT_REF           filename of style pendant reference
BAIL_REF              filename of bail reference (optional)
FONT                  style.defaults.font or "inherit_source_style"
EMBLEM                "none" | "crown" | "heart" | "spade" | "butterfly" | "moneybag"
SCHEME_TYPE           "single_tone" | "two_tone"
PRIMARY_METAL         "rose_gold" | "white_gold" | "yellow_gold"
SECONDARY_METAL       same set; equals PRIMARY_METAL when single-tone
COLOR_SCHEME          human string e.g. "two_tone rose_gold + white_gold"
CAPS_POLICY           "as_typed" | "forced_all_caps"
BUBBLE_OUTLINE        boolean
BUBBLE_OUTLINE_ENABLED same as BUBBLE_OUTLINE
VIEW                  e.g. "front_view"
```

If you add a new placeholder, update `builder.ts` and every template that uses it.

## Prompting rules (preserve in every template)

**Universal jewelry physics:**

- Letters connect into one rigid piece. No floating islands. Add discreet connectors where needed.
- Emblem structurally connected, centered above the text, ~15–30% of the text height.
- Top connector aligned with the wordmark's center of mass.
- Gold = rim / prongs / structural back. Diamonds = visible decorative surfaces. **Avoid large bare gold fields** unless thin outlines / prongs / backs.
- Spelling correctness is a hard requirement. A pretty render with the wrong text is a failure.

**Word choice:**

- **Avoid the word "bail"** — Gemini misreads it. Prefer "top connector", "chain attachment", "suspension loop", "rectangular suspension loop", "twin support struts".

**Lexy (rounded script with heavy outline):** emphasize *heavy outline / perimeter rim / halo border / bubble outline / continuous unified contour* that merges letters into one plate; micro-pavé round diamonds; no gaps between rim and letters; no floating strokes. Keep the detailed `text_bubble_outline` block.

**King and Jhon (bold slanted block):** emphasize *uppercase heavy slanted block lettering, front view, invisible-set baguette diamond interiors, mosaic / brick baguette layout, minimal visible metal between baguettes, round micro-pavé perimeter border, seamless diamond outline*. The current generic `block_baguette_v1` is too short for these and needs expansion.

## What the API stores

`Request` rows store the user's choices. `Result` rows store the **exact prompt** sent for that variant alongside the image URL — this matters because prompt iteration is the main game; you need to see what was sent to understand what came back. Don't drop prompt persistence.

## Things not to do

- **Don't run the dev server from the repo root.** The style registry resolves `process.cwd()/src/lib/styles`; only `cd mvp-jewelry-app && npm run dev` works.
- **Don't maintain both** the root scaffold (`/package.json`, `/tsconfig.json`, `/prisma/`, `/dev.db`) and the inner one. The inner is canonical; the root scaffold is residual and should be deleted (or the inner flattened up to root).
- **Don't add a `PendantStyle` DB table.** The root migration `prisma/migrations/0003_pendant_styles/migration.sql` is abandoned. UI style list stays as `data/pendant-styles.json`.
- **Don't expose advanced prompt knobs to the customer.** No `deviationStrength` slider, no "bubble outline" checkbox.
- **Don't put long prompt text in TypeScript.** Templates are `.jsonp` for a reason.
- **Don't replace YAML+templates with a `switch (styleId)`.**
- **Don't add auth yet.** `userId: "demo"` stays for the MVP; the schema already supports multi-store later.
- **Don't make `diamondQuality` a major prompt control.** Image models won't visually distinguish VS vs VVS reliably. Store it as metadata, use it lightly in prompt wording at most.
- **Don't trust the `lib/styles/` re-export layer to stay.** It exists only because tsconfig path aliases aren't wired through; once they are, that folder gets deleted.

## Roadmap (cleanup priorities)

In order:

1. **Stop treating repo root as an app.** Either flatten `mvp-jewelry-app/` up to repo root or delete the outer scaffold (`/package.json`, `/tsconfig.json`, `/prisma/`, `/dev.db`, `/package-lock.json`).
2. **Fix tsconfig path aliases**, then delete the `lib/styles/` and `server/db/client.ts` re-export shims:
   ```json
   "paths": {
     "@/*": ["./*"],
     "@/lib/styles/*": ["./src/lib/styles/*"],
     "@/server/*": ["./src/server/*"]
   }
   ```
3. **Migrate templates to shared families** under `src/lib/styles/_templates/` with optional `<style>/template.jsonp` overrides. Update `registry.ts:getTemplatePath` to implement the resolution rule.
4. **Enforce `emblemsAllowed`** in `builder.ts` — currently the YAML field exists but is not checked.
5. **Add a mock mode.** When `MOCK_IMAGE_API=true`, `connector.ts` should return URLs from a pool of local sample images instead of calling Gemini. Lets the frontend be exercised without burning API credit.
6. **Add `diamondQuality`** to the `Request` model (`String?`) and the POST body (`"vs" | "vvs"`).
7. **Expand `block_baguette_v1`** with the King/Jhon prompting rules above.
8. ~~**Make generation async.**~~ **Done.** POST returns `requestId` immediately; frontend polls GET every 2 s; tiles appear as each variant completes.
9. **Wire `waitUntil` for Vercel production.** The current `void Promise.all(...)` pattern works in dev but risks early Lambda termination on Vercel. Use `waitUntil` from `@vercel/functions`.
10. **Move generated image storage off the local FS** (R2 / S3 / Supabase Storage / Cloudinary). Keep the swap inside `connector.ts` or a small storage helper.
11. **Persist the customer's selected favorite** after the results step (currently the choice has no storage).

Treat earlier items as prerequisites for later ones where they touch the same files.
