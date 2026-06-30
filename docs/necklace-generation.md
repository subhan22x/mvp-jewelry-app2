# Necklace Generation

## Product Behavior

The necklace flow is quote-first and only generates a new image when the customer uploads a pendant to attach.

- If the customer chooses a necklace style, color, size, stone, and budget with no pendant upload, the app uses the prebuilt style/color reference image as the review and quote image.
- If the customer uploads a pendant image, the app sends one Gemini image generation request with two attachments:
  - the selected necklace style/color reference image
  - the customer pendant upload
- The prompt is intentionally simple:

```text
attach this pendant to it, attach only the pendant not anything else in the image, keep the construction and lighting realistic
```

The implementation appends a short preservation sentence so Gemini keeps the chosen necklace color, mannequin, shirt, lighting, and product-photo framing from the necklace reference.

## Backend Route

`POST /api/necklace-requests`

Accepted body is `multipart/form-data` or JSON.

Core fields:

- `userId`
- `accountSlug`
- `styleId`: `slim_cuban`, `cuban`, `fat_cuban`, `spiked_cuban`, `figaro`, `baguette_tennis`, `multi_style`
- `metalColor`: `yellow_gold`, `white_gold`, `rose_gold`
- `size`: `18`, `20`, `22`, `30`
- `stoneType`: `vvs_moissanite`, `natural_diamond`, `lab_diamond`, `cz`
- `budgetMinCents`
- `budgetMaxCents`

Optional pendant upload:

- `pendantImage`: direct form file upload
- `pendantUpload`: JSON direct-upload reference from `/api/uploads/presign` with purpose `necklace-pendant`

Optional quote contact:

- `customerName`
- `customerPhone`
- `customerEmail`

If contact is provided, the route creates a `Lead` for the request. Once the request has a successful image result, `ensureDraftQuoteForRequest()` creates or reuses the private draft `QuoteRequest`.

## Data Model

Necklace requests reuse the main generation tables:

- `Request.productType = "necklace"`
- `Request.pendantFinish = "chain_only"` when no pendant was uploaded
- `Request.pendantFinish = "pendant_attached"` when Gemini generation is requested
- `Request.styleId = "necklace_<styleId>"`
- `Request.primaryMetal` stores the selected necklace color
- `Request.size` stores the chain length
- `Request.stoneType` stores the selected stone type
- `Request.uploadFileName` stores the original pendant file name when uploaded
- `Request.budgetMinCents` and `Request.budgetMaxCents` store the customer budget range

Every necklace request creates exactly one `Result`.

- No pendant upload: `Result.status = "succeeded"`, `Result.imageUrl` is the static style/color reference image, and `Result.modelId = "static-necklace-reference-v1"`.
- Pendant upload: `Result.status = "pending"` until Gemini completes, `Result.prompt` stores the exact prompt, and `Result.modelId` stores the provider model, currently `gemini-3.1-flash-image`.

When a draft quote is created, `QuoteRequest` snapshots the request fields including `productType`, `styleId`, `primaryMetal`, `size`, `stoneType`, `designedImageUrl`, `budgetMinCents`, and `budgetMaxCents`.

## Assets

Stable style/color reference images live in:

```text
public/necklaces/references/
```

The mapping is code-owned in:

```text
src/lib/necklaces/config.ts
```

These images came from `/home/rox/Downloads/necklace styles`, where each style folder used opaque filenames. The app should only rely on the stable public filenames and the config map.

## Upload Storage

Pendant uploads are treated as provider inputs, not final customer-facing media.

- Direct browser uploads use `/api/uploads/presign` with purpose `necklace-pendant`, stored under `incoming/necklace-pendant/...` in R2.
- Server fallback uploads are written to a temporary directory under the OS temp folder for the duration of generation.
- The generated composite is saved by `src/lib/styles/connector.ts` through `saveGeneratedImage()`, which writes to R2 when configured or `public/generated` in development.
- The public quote image is the generated composite if a pendant was uploaded; otherwise it is the static style/color reference image.

