# VVS Studio Implementation Plan

## Scope

Build **VVS Studio** as a new feature inside the existing owner area. It will appear in the left owner navigation as **VVS Studio** and live at `/owner/vvs-studio`.

V1 includes both studio image generation and video reel generation. Image generation should be provider-swappable between OpenAI and Gemini. Video generation should use Wavespeed, following the same provider pattern already used elsewhere in the app.

The product goal is a demo-first wizard that helps jewelry stores upload one to three phone photos of a piece, enter product details, choose a visual style and aspect ratio, generate a studio-quality marketing image, regenerate it, then optionally generate and save a short video reel from the selected image.

## Confirmed Decisions

- The feature name is **VVS Studio**.
- The first implementation is a public demo. It should be reachable without requiring the owner password.
- The demo should live under `/owner` for now, specifically `/owner/vvs-studio`, because it is architecturally part of the owner product.
- The feature should be designed so it can later live outside `/owner` as a public or standalone experience.
- VVS Studio does not replace `/owner/studio`; both should continue to exist.
- `/owner/studio` should link to `/owner/vvs-studio`.
- VVS Studio assets are owner-created assets. They are not tied to customer leads in V1.
- Support only new shoots in V1. Reopening and editing old shoots can come later.
- Image generation is a valid stopping point. Video generation is optional.
- A shoot is considered fully complete after video generation succeeds, but a user can intentionally end after image generation and start a new shoot.
- Auth should not block the first demo. Keep the code account-scoped and ready for owner auth later, but do not require auth for the demo route.
- Use the attached/extracted design bundle as the source of truth for fonts and visual details. Match the screenshot and follow the zip design spec for most design decisions.
- Use existing theme classes where they fit, but the final UI must be adaptable, responsive, touch-friendly, and polished.
- Share buttons should be functional in V1.
- Use tasteful animations and make generation progress feel as real as possible, even while provider progress is approximated.

## Design Source

Read from the Claude Design handoff:

- `vvs-studio/README.md`
- `vvs-studio/chats/chat1.md`
- `vvs-studio/project/VVS Studio Wireframes.html`
- User-provided screenshot: `Screenshot_20260518_212825.png`

Relevant design direction:

- Use the **A - Linear Wizard** flow as the implementation target.
- Mobile-first, focused, step-by-step wizard.
- Dark charcoal background, muted gray panels, gold accent.
- Font direction from design: `Figtree` for headings and `DM Sans` for body/control text. The app already uses similar admin styling, so align with `OwnerFrame` colors while preserving VVS Studio polish.
- Final owner flow:
  1. Piece + Capture
  2. Details Form
  3. Theme + Format
  4. Generating Image
  5. Image Result
  6. Generating Video
  7. Video Result

## Existing Repo Context

Current owner dashboard:

- `/owner` is the main quote dashboard.
- `/owner/OwnerFrame.tsx` owns the left sidebar.
- Auth is cookie-based through `owner_session`.
- Demo access code is controlled by `OWNER_ACCESS_CODE`; demo should use `ID8`.
- VVS Studio is the exception for the first demo: `/owner/vvs-studio` should be publicly reachable while still using the demo account behind the scenes.
- Existing owner route patterns:
  - `app/owner/studio/page.tsx`
  - `app/owner/videos/page.tsx`
  - `app/api/owner/video-jobs/route.ts`
  - `src/lib/owner-auth.ts`

Current generation data:

- Customer pendant/image generation uses `Request` and `Result`.
- Owner video jobs use `VideoGeneration`.
- VVS Studio should have its own data model section, but each record must be linked to `Account`.
- Existing Wavespeed video code in `app/api/owner/video-jobs/route.ts`, `src/lib/video/*`, and `@/lib/video/wavespeed` should be reused as the implementation reference for VVS Studio video generation.

## Navigation Plan

Update `app/owner/OwnerFrame.tsx`:

- Add a nav item:
  - label: `VVS Studio`
  - href: `/owner/vvs-studio`
  - active key: `VVS Studio`
- Keep existing `Studio` page for generated pendant/video management.
- Do not replace `/owner/studio`; VVS Studio is a separate feature.
- Add a prominent link/card from `/owner/studio` to `/owner/vvs-studio`, because Studio is the natural discovery surface for creative tools.

Create route:

- `app/owner/vvs-studio/page.tsx`
  - Server component.
  - For the public demo, render without requiring `isOwnerAuthenticated()`.
  - Still wrap in `OwnerFrame active="VVS Studio"` so the demo appears in the owner product shell.
  - Add a clear code comment that this is demo-public by product decision and can be gated later.
  - For production gating later, switch back to the existing owner pattern: check `isOwnerAuthenticated()` and render `OwnerLoginForm` when absent.

Create client component:

- `app/owner/vvs-studio/VvsStudioWizard.tsx`
  - Owns wizard state and UI transitions.
  - Talks to VVS Studio APIs, which are demo-public but account-scoped for the first implementation.
  - Handles upload preview, validation, image generation polling, result display, regenerate, video generation polling, and final save actions.

Optional supporting files:

- `app/owner/vvs-studio/components/AngleUploadCard.tsx`
- `app/owner/vvs-studio/components/StepProgress.tsx`
- `app/owner/vvs-studio/components/PieceDetailsForm.tsx`
- `app/owner/vvs-studio/components/ThemeFormatStep.tsx`
- `app/owner/vvs-studio/components/GenerationProgress.tsx`
- `app/owner/vvs-studio/components/StudioResultCard.tsx`
- `app/owner/vvs-studio/components/VideoResultCard.tsx`

## Frontend Flow

### Step 1: Piece + Capture

Purpose: collect one to three source images and a visual style. Follow the design spec for the order of controls: piece type selection belongs on the details step, not moved into Step 1.

Controls:

- Three upload cards, with one image minimum:
  - Top View
  - Left Angle
  - Right Angle
- Style/theme cards:
  - Dark
  - Marble
  - Street
  - Velvet
  - Ice

Validation:

- Require at least one uploaded image before moving forward.
- Require style/theme.

Implementation notes:

- Use `<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment">` behind styled upload cards on mobile where camera capture is useful.
- Show local previews with `URL.createObjectURL`.
- Create or reuse a draft shoot before the first upload, then upload immediately after file selection. Do not wait until the user clicks Next.
- Upload cards should show the guide graphic before upload and the selected preview after upload.
- Users must be able to replace or remove any uploaded image.
- Support drag-and-drop on desktop.
- Use the visual upload graphics from the design bundle if they are moved into `public/vvs-studio/`.

### Step 2: Details Form

Purpose: collect jewelry metadata that will later feed the prompt builder.

Fields:

- Piece type chips, placed according to the design spec:
  - Pendant
  - Ring
  - Chainz
  - Grills
  - Band
- Metal type, dropdown:
  - 10K Gold
  - 14K Gold
  - 18K Gold
- Gold color, segmented buttons or dropdown:
  - Yellow Gold
  - White Gold
  - Rose Gold
- Diamond weight, text or number input.
- Engraving/text, text input.
- Price, text input.
- Stone setting chips:
  - Micro Pave
  - Flooded
  - Baguette
  - Invisible
- The separate gold color control replaces the earlier combined metal/color options. Do not show Platinum or Sterling Silver in the V1 metal type dropdown.

Validation:

- Require metal type.
- Require gold color.
- Require piece text/name only when piece type requires text.
- Price can be optional but should be captured if present.
- Diamond weight optional.
- Stone setting optional for non-stone pieces, but default to `micro_pave` for pendant/ring/grill if no choice is made.

### Step 3: Theme + Format

Purpose: choose final creative direction and output aspect ratio.

Controls:

- Mood chips:
  - Luxury
  - Street
  - Editorial
  - Minimal
- Aspect ratio cards:
  - Square, `1:1`, Instagram Post
  - Expanded, `4:5`, Instagram Feed
  - Story, `9:16`, Reels/TikTok

Primary action:

- `Generate Studio Asset`

Validation:

- Require mood.
- Require aspect ratio.
- On submit, persist the shoot and start generation.

### Step 4: Generating Image

Purpose: show an owner-friendly progress state while backend generation runs.

UI:

- Center spinner.
- Progress bar.
- Status checklist:
  - Analyzing jewelry geometry
  - Removing background
  - Applying selected theme
  - Compositing studio lighting

Implementation:

- Start a generation job via owner API.
- Poll a status endpoint every 2 seconds.
- When status is `succeeded`, transition to Result.
- If status is `failed`, show retry/back controls.
- If status exceeds timeout, show a retry message.

### Step 5: Image Result

Purpose: review and act on the generated studio asset.

UI:

- Header with Back, VVS Studio logo/label, and optional Share.
- Safe-zone top actions:
  - Regenerate
- Generated image card.
- Info overlay with piece name, metal, setting, price.
- Bottom actions:
  - Save Image
  - Generate Video Reel
  - New Shoot or Finish Here

Implementation:

- Do not include edit-after-generation in V1, even if the design reference shows an `Edit Details` button. Once an image is generated, the supported actions are regenerate, save/share, generate video, or start a new shoot.
- `Regenerate` creates a new generation attempt for the same shoot.
- `Save Image` links to the generated image URL with `download`.
- `Share` should be functional. Prefer the Web Share API when available; otherwise copy the generated output URL to clipboard and show a small copied state.
- `Generate Video Reel` starts Wavespeed video generation from the generated image.
- `New Shoot` or `Finish Here` lets the user end at image generation without creating a video.

### Step 6: Generating Video

Purpose: show progress while Wavespeed generates a motion reel from the selected studio image.

UI:

- Small thumbnail of the generated image with spinner overlay.
- Progress bar.
- Status checklist:
  - Applying camera motion path
  - Animating light reflections
  - Rendering frames
  - Encoding for social media

Implementation:

- Start a VVS Studio video job through the account-scoped VVS Studio API.
- Use the existing Wavespeed integration style from `app/api/owner/video-jobs/route.ts`.
- Poll every 3 seconds until the video row is `succeeded` or `failed`.
- On success, transition to Video Result.

### Step 7: Video Result

Purpose: let the owner preview, save, or start a new shoot.

UI:

- Header with Back, VVS Studio logo/label, and optional Share.
- Status tags:
  - Video Reel
  - duration + aspect ratio
  - Ready
- Video preview card with play button.
- Bottom actions:
  - Save Video
  - New Shoot

Implementation:

- Use a real `<video controls playsInline>` when `videoUrl` exists.
- `Save Video` links to the generated video URL with `download`.
- `Share` should use the same Web Share API/clipboard fallback as the image result.
- `New Shoot` resets wizard state.

## UI Architecture

Recommended component tree:

```text
app/owner/vvs-studio/page.tsx
  OwnerFrame active="VVS Studio"
    VvsStudioWizard
      VvsStudioHeader
      StepProgress
      StepPieceCapture
        AngleUploadCard x3
        ThemeCard list
      StepDetailsForm
      StepThemeFormat
        MoodChip list
        AspectRatioCard list
      StepGeneratingImage
      StepImageResult
      StepGeneratingVideo
      StepVideoResult
```

State shape:

```ts
type VvsWizardState = {
  step: "capture" | "details" | "theme" | "generatingImage" | "imageResult" | "generatingVideo" | "videoResult";
  shootId?: string;
  imageGenerationId?: string;
  videoGenerationId?: string;
  pieceType?: "pendant" | "ring" | "chainz" | "grills" | "band";
  uploads: {
    top?: VvsUploadedFile;
    left?: VvsUploadedFile;
    right?: VvsUploadedFile;
  };
  visualStyle: "dark" | "marble" | "street" | "velvet" | "ice";
  metalType: "10k_gold" | "14k_gold" | "18k_gold";
  goldColor: "yellow_gold" | "white_gold" | "rose_gold";
  diamondWeight?: string;
  engravingText?: string;
  price?: string;
  stoneSetting?: "micro_pave" | "flooded" | "baguette" | "invisible";
  mood: "luxury" | "street" | "editorial" | "minimal";
  aspectRatio: "square" | "expanded" | "story";
  imageProvider: "openai" | "gemini";
  imageModelId: string;
  generatedImageUrl?: string;
  generatedVideoUrl?: string;
  error?: string;
};

type VvsUploadedFile = {
  uploadId?: string;
  localFile?: File;
  previewUrl?: string;
  normalizedImageUrl?: string;
  status: "local" | "uploading" | "uploaded" | "failed";
  error?: string;
};
```

Autosave:

- Autosave draft state after each meaningful field change or upload mutation.
- Use a debounced `PATCH /api/owner/vvs-studio/shoots/:shootId` once a draft `shootId` exists.
- Use a small localStorage backup only before the shoot exists or if the network is temporarily unavailable.
- Do not expose source uploads in a public gallery. The only source preview the user sees is the preview inside the current upload card while building the shoot.

## Backend Architecture

VVS Studio should have its own tables rather than overloading `Request` and `Result`. The existing `Request/Result` models are customer pendant-specific and already carry pendant customization fields. VVS Studio needs source uploads, owner-created shoots, aspect ratios, moods, and regeneration history.

### Data Model Chart

```text
Account
  1 ── many VvsStudioShoot
             1 ── many VvsStudioUpload
             1 ── many VvsStudioImageGeneration
             1 ── many VvsStudioVideoGeneration
```

### Prisma Models

Add to all schema mirrors:

- `prisma/schema.prisma`
- `prisma/schema.postgres.prisma`
- `src/server/db/schema.prisma`

Recommended fields:

```prisma
model Account {
  // existing fields...
  VvsStudioShoots           VvsStudioShoot[]
  VvsStudioUploads          VvsStudioUpload[]
  VvsStudioImageGenerations VvsStudioImageGeneration[]
  VvsStudioVideoGenerations VvsStudioVideoGeneration[]
}

model VvsStudioShoot {
  id             String   @id @default(cuid())
  accountId      String
  account        Account  @relation(fields: [accountId], references: [id])

  createdByUserId String?

  pieceType      String   // pendant | ring | chainz | grills | band
  visualStyle    String   // dark | marble | street | velvet | ice
  mood           String?  // luxury | street | editorial | minimal
  aspectRatio    String?  // square | expanded | story

  metalType      String?  // 10k_gold | 14k_gold | 18k_gold
  goldColor      String?  // yellow_gold | white_gold | rose_gold
  diamondWeight  String?
  engravingText  String?
  priceLabel     String?
  stoneSetting   String?

  status         String   @default("draft") // draft | ready | generating_image | image_succeeded | image_finalized | generating_video | video_succeeded | failed | archived
  error          String?
  imageFinalizedAt DateTime?
  completedAt    DateTime?

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  Uploads        VvsStudioUpload[]
  ImageGenerations VvsStudioImageGeneration[]
  VideoGenerations VvsStudioVideoGeneration[]

  @@index([accountId, createdAt])
  @@index([accountId, status])
}

model VvsStudioUpload {
  id          String   @id @default(cuid())
  accountId   String
  account     Account  @relation(fields: [accountId], references: [id])
  shootId     String
  shoot       VvsStudioShoot @relation(fields: [shootId], references: [id])

  angle       String   // top | left | right
  storageKey  String
  imageUrl    String   // private/source URL or internal storage URL, not shown in result/library UI
  originalContentType String?
  normalizedContentType String @default("image/jpeg")
  fileSize    Int?
  width       Int?
  height      Int?
  originalFileNameHash String?

  createdAt   DateTime @default(now())

  @@index([accountId, createdAt])
  @@index([shootId])
  @@unique([shootId, angle])
}

model VvsStudioImageGeneration {
  id              String   @id @default(cuid())
  accountId       String
  account         Account  @relation(fields: [accountId], references: [id])
  shootId         String
  shoot           VvsStudioShoot @relation(fields: [shootId], references: [id])

  variant         Int      @default(1)
  status          String   @default("pending") // pending | succeeded | failed
  prompt          String
  promptVersion   String?
  provider        String   // openai | gemini
  modelId         String?
  providerJobId   String?
  imageUrl        String?
  error           String?
  startedAt       DateTime?
  completedAt     DateTime?
  durationMs      Int?
  createdAt       DateTime @default(now())

  @@index([accountId, createdAt])
  @@index([accountId, status])
  @@index([shootId, createdAt])
}

model VvsStudioVideoGeneration {
  id              String   @id @default(cuid())
  accountId       String
  account         Account  @relation(fields: [accountId], references: [id])
  shootId         String
  shoot           VvsStudioShoot @relation(fields: [shootId], references: [id])
  sourceImageGenerationId String?
  sourceImageUrl  String

  status          String   @default("pending") // pending | succeeded | failed
  prompt          String
  promptVersion   String?
  provider        String   @default("wavespeed")
  modelId         String?
  providerJobId   String?
  videoUrl        String?
  remoteVideoUrl  String?
  error           String?
  startedAt       DateTime?
  completedAt     DateTime?
  durationMs      Int?
  createdAt       DateTime @default(now())

  @@index([accountId, createdAt])
  @@index([accountId, status])
  @@index([shootId, createdAt])
}
```

### Why Separate Tables

Separate VVS tables are cleaner because:

- VVS Studio is owner-authored, not customer-authored.
- It supports one to three source uploads per shoot.
- It supports regeneration history.
- The final assets are marketing/social assets, not customer quote requests.
- It avoids adding many nullable VVS-only columns to `Request`.
- It still links cleanly to `Account`, preserving tenant ownership.

## API Plan

VVS Studio API routes should be account-scoped even while the first demo is public.

For the first public demo:

- Use `getDefaultAccountId()` for all VVS Studio API routes.
- Allow unauthenticated access only for the VVS Studio demo routes.
- Do not loosen auth for the rest of `/owner` or existing owner APIs.
- Keep the VVS API code structured so a future switch to `isOwnerRequestAuthenticated(req)` is localized.

Recommended helper:

```ts
function getVvsStudioAccountIdForRequest(req: Request) {
  // Demo-first behavior: public route, demo account.
  // Later production behavior can require isOwnerRequestAuthenticated(req).
  return getDefaultAccountId();
}
```

When multi-account auth is expanded, replace this with the authenticated membership account.

### Create Draft Shoot

`POST /api/owner/vvs-studio/shoots`

Body:

```json
{
  "visualStyle": "dark"
}
```

Behavior:

- Resolve the VVS Studio account via the demo account helper.
- Accept an empty body so the client can create a draft before the first upload.
- Create `VvsStudioShoot` with `status: "draft"`.
- Return `{ shootId }`.

### Upload Angle Images

V1 simple route:

`POST /api/owner/vvs-studio/shoots/:shootId/uploads`

Body:

- `multipart/form-data`
- fields:
  - `angle`: `top | left | right`
  - `file`: image file

Behavior:

- Resolve the VVS Studio account via the demo account helper.
- Verify shoot belongs to account.
- Validate and normalize the image before storage.
- Store source uploads privately in R2 for the real implementation, with a local private dev fallback if needed.
- Upsert `VvsStudioUpload` by `shootId + angle`.
- Return `{ uploadId, imageUrl }`.

Validation and conversion:

- Allow JPEG, PNG, WebP, HEIC, and HEIF.
- Enforce a 15 MB maximum file size.
- Do not keep or expose the original filename.
- Validate `file.type` against an allowlist: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`.
- Inspect magic bytes where feasible:
  - JPEG starts with `FF D8 FF`
  - PNG starts with `89 50 4E 47`
  - WebP uses `RIFF....WEBP`
  - HEIC/HEIF has an `ftyp` brand such as `heic`, `heix`, `hevc`, `hevx`, `mif1`, or `msf1`
- Reject mismatched file extensions, MIME types, or undecodable images.
- Decode and normalize through `sharp` when possible. Convert supported uploads to JPEG for provider compatibility, quality around 92, with no intentional resize/downscale in V1.
- HEIC support depends on deployed image tooling. Try `sharp` first; if the deployment build lacks HEIF support, add a dedicated conversion package or return a clear 415 error until conversion is available.
- Suggested private storage key:
  - `vvs-studio/{accountSlugOrId}/{yyyyMMdd-HHmmss}-{shootId}-{angle}-{random}.jpg`
  - For the public demo, use the demo account slug/id. Later, use a sanitized username or account slug when available.

### Remove Angle Image

`DELETE /api/owner/vvs-studio/shoots/:shootId/uploads/:uploadId`

Behavior:

- Resolve the VVS Studio account via the demo account helper.
- Verify shoot and upload belong to account.
- Delete the `VvsStudioUpload` row.
- Do not physically delete the R2 object in V1 unless storage lifecycle cleanup is added. This keeps the first implementation simpler and preserves audit/regeneration data.
- Return `{ ok: true }`.

### Update Shoot Details

`PATCH /api/owner/vvs-studio/shoots/:shootId`

Body:

```json
{
  "pieceType": "pendant",
  "metalType": "14k_gold",
  "goldColor": "yellow_gold",
  "diamondWeight": "1.2ct total",
  "engravingText": "LOYALTY",
  "priceLabel": "$4,500",
  "stoneSetting": "micro_pave",
  "mood": "luxury",
  "aspectRatio": "square"
}
```

Behavior:

- Resolve the VVS Studio account via the demo account helper.
- Verify account ownership.
- Patch editable fields.
- If all required fields and at least one upload are present, set `status: "ready"`.

### Start Image Generation

`POST /api/owner/vvs-studio/shoots/:shootId/generate`

Body:

```json
{
  "provider": "openai",
  "modelId": "gpt-image-1"
}
```

Behavior:

- Resolve the VVS Studio account via the demo account helper.
- Verify account ownership.
- Verify at least one upload exists. Attach all available source uploads, one to three images, to the provider call.
- Build prompt via a placeholder VVS prompt builder.
- Resolve image model from the request body or account-level defaults.
- Create `VvsStudioImageGeneration` with `status: "pending"`, `provider`, and `modelId`.
- Set shoot status to `generating_image`.
- Start async image generation.
- Return `{ generationId }`.

### Finish At Image

`POST /api/owner/vvs-studio/shoots/:shootId/finalize-image`

Behavior:

- Resolve the VVS Studio account via the demo account helper.
- Verify account ownership.
- Verify the shoot has at least one successful image generation.
- Set `status: "image_finalized"` and `imageFinalizedAt`.
- Do not set `completedAt`, because product completion is reserved for successful video generation.
- Return the updated shoot summary so the client can reset into a new shoot.

### Poll Generation Status

`GET /api/owner/vvs-studio/generations/:generationId`

Behavior:

- Resolve the VVS Studio account via the demo account helper.
- Verify account ownership.
- Return generation status:

```json
{
  "id": "gen_...",
  "shootId": "shoot_...",
  "status": "succeeded",
  "imageUrl": "/generated/vvs-studio/...",
  "error": null,
  "durationSeconds": 14.2
}
```

### Regenerate

Use the same generate route:

`POST /api/owner/vvs-studio/shoots/:shootId/generate`

Behavior:

- Create a new `VvsStudioImageGeneration` row with incremented `variant`.
- Keep previous generations.
- Result screen should show the latest successful generation.

### Start Video Generation

`POST /api/owner/vvs-studio/shoots/:shootId/video`

Body:

```json
{
  "imageGenerationId": "gen_..."
}
```

Behavior:

- Resolve the VVS Studio account via the demo account helper.
- Verify account ownership.
- Verify the referenced image generation belongs to the shoot and has a successful `imageUrl`.
- Build a VVS Studio video prompt from shoot metadata and selected image.
- Create `VvsStudioVideoGeneration` with `status: "pending"`, `provider: "wavespeed"`, and the Wavespeed model ID.
- Set shoot status to `generating_video`.
- Call Wavespeed using the same pattern as the existing owner video job route.
- Persist `remoteVideoUrl`, local/public `videoUrl`, `providerJobId`, duration, status, and error.
- On success, set shoot status to `video_succeeded` and set `completedAt`.
- Return `{ videoGenerationId }`.

### Poll Video Generation Status

`GET /api/owner/vvs-studio/videos/:videoGenerationId`

Behavior:

- Resolve the VVS Studio account via the demo account helper.
- Verify account ownership.
- Return status, `videoUrl`, `error`, and duration.

### Model Settings

`GET /api/owner/vvs-studio/model-settings`

`PATCH /api/owner/vvs-studio/model-settings`

Purpose:

- Keep image model switching easy without changing the wizard or route handlers.
- Store defaults in `AppSetting` for V1, or a dedicated `VvsStudioModelSetting` model later if settings become complex.

Recommended setting keys:

- `vvs_studio.image_provider`: `openai | gemini`
- `vvs_studio.openai_image_model`: default OpenAI image model ID
- `vvs_studio.gemini_image_model`: default Gemini image model ID
- `vvs_studio.video_provider`: `wavespeed`
- `vvs_studio.wavespeed_video_model`: Wavespeed model ID

Owner UI:

- Add an advanced model selector on the Theme + Format step or in a compact settings popover:
  - Image provider: OpenAI or Gemini
  - Image model: dropdown based on provider
- Persist the selected provider/model on each image generation row so old jobs remain reproducible.

### List Shoots / Asset Library

Optional but recommended for dashboard continuity:

`GET /api/owner/vvs-studio/shoots`

Filters:

- `status`
- `pieceType`
- `q`

Use later for a VVS asset history panel.

## Prompt Builder Plan

The user will build the final prompting structure later. For now, create a stable placeholder boundary so the feature can be implemented without hardcoding prompt assembly inside route handlers.

Create:

- `src/lib/vvs-studio/types.ts`
- `src/lib/vvs-studio/prompt-builder.ts`
- `src/lib/vvs-studio/image-generator.ts`
- `src/lib/vvs-studio/video-generator.ts`
- `src/lib/vvs-studio/model-settings.ts`

Placeholder function:

```ts
export function buildVvsStudioImagePrompt(input: VvsStudioPromptInput) {
  return [
    `Create a studio-quality jewelry marketing image.`,
    `Piece type: ${input.pieceType}.`,
    `Mood: ${input.mood}.`,
    `Visual style: ${input.visualStyle}.`,
    `Aspect ratio: ${input.aspectRatio}.`,
    `Metal: ${input.metalType}.`,
    `Gold color: ${input.goldColor}.`,
    input.engravingText ? `Text/engraving: ${input.engravingText}.` : "",
    input.priceLabel ? `Price label: ${input.priceLabel}.` : "",
    `Use the attached source image(s) as geometry and material references.`
  ].filter(Boolean).join("\n");
}
```

Image generation should go through a provider adapter instead of directly calling one provider in route handlers:

```ts
type VvsImageProvider = "openai" | "gemini";

export async function generateVvsStudioImage(input: {
  provider: VvsImageProvider;
  modelId: string;
  prompt: string;
  attachments: string[]; // one to three normalized JPEG source uploads
  generationId: string;
}) {
  if (input.provider === "openai") return generateWithOpenAIImageModel(input);
  return generateWithGeminiImageModel(input);
}
```

Video generation should use Wavespeed:

```ts
export function buildVvsStudioVideoPrompt(input: VvsStudioVideoPromptInput) {
  return [
    "Create a premium jewelry marketing reel from the provided studio image.",
    `Piece type: ${input.pieceType}.`,
    `Mood: ${input.mood}.`,
    `Aspect ratio: ${input.aspectRatio}.`,
    "Use subtle camera motion, polished light sweeps, and luxury product-video pacing."
  ].join("\n");
}
```

The Wavespeed call should reuse the existing owner video-job approach, including public image URL validation, local/R2 video persistence, status updates, and captured provider metadata.

## Storage Plan

Use R2 for the real implementation because the app has used that path before. Keep the DB model independent of storage provider so local development can fall back to filesystem storage when credentials are absent.

Source uploads:

- Store privately.
- Do not display source uploads in history, public pages, generated result cards, or share links.
- Do not delete source uploads when a shoot is archived in V1. Preserve them for audit/regeneration.
- Normalize uploads to JPEG when possible.
- Store `storageKey`, normalized content type, original content type, size, and dimensions.
- Do not store the original filename. Store a hash only if debugging or dedupe needs it.
- Suggested key:
  - `vvs-studio/{accountSlugOrId}/{yyyyMMdd-HHmmss}-{shootId}-{angle}-{random}.jpg`

Generated images:

- Store in R2 or the existing generated media storage path.
- Generated image URLs may be user-visible because users need to preview, download, and share the finished image.
- If public URLs are used for the demo, keep that isolated to generated outputs, not source uploads.

Generated videos:

- Store in R2 or the existing generated video storage path.
- Generated video URLs may be user-visible because users need to preview, download, and share the finished video.

Signed URLs:

- Signed URLs are a later improvement.
- For V1, source uploads remain private/internal. Generated outputs can use the existing media URL behavior.

## Auth And Account Ownership

Demo and later owner access:

- Demo access code: `ID8`.
- Keep current owner auth path:
  - `POST /api/owner-auth`
  - `OWNER_SESSION_COOKIE`
  - `isOwnerAuthenticated()`
  - `isOwnerRequestAuthenticated(req)`

For the first demo, VVS Studio routes should not require an owner session. They must still:

1. Resolve the demo account with `getDefaultAccountId()`.
2. Scope every query by `accountId`.
3. Return 404 for records outside the account, not 403, to avoid leaking IDs.

Current demo:

- `getDefaultAccountId()` returns the demo account.
- Auth can be revisited later; do not let it block the first implementation.

Future multi-account:

- Require owner auth with `isOwnerRequestAuthenticated(req)`.
- Resolve `accountId` from owner session membership instead of default.

## UI Visual Direction

Use a self-contained VVS Studio visual layer inside `/owner/vvs-studio` while still nested in `OwnerFrame`.

Tokens:

```ts
const vvs = {
  bg: "#16161a",
  panel: "#1e1e24",
  panelDeep: "#101114",
  border: "#35353d",
  gold: "#D4A853",
  text: "#eaeaf0",
  softText: "#c0c0c8",
  muted: "#606068"
};
```

Layout:

- Mobile-first wizard width should feel close to 390px design.
- On desktop, center the wizard in the owner content area.
- Avoid crowded dashboard layouts; each step should focus on one task.
- Use compact cards, pills, and progress dots.
- Use real file previews for uploads.
- Use text and controls from the design, not marketing copy.
- Follow the extracted design bundle's font choices: `Figtree` for heading/logo-like UI and `DM Sans` for body, labels, and controls.
- Use existing theme classes where they help with consistency inside the owner dashboard, but allow a self-contained VVS layer for the dark/gold studio treatment.
- Make the wizard adaptive and responsive: mobile should match the narrow screenshot closely; desktop should keep the same focused card rhythm rather than stretching into a sparse dashboard.
- Use touch-friendly targets for all upload cards, chips, buttons, and dropdowns.
- Use subtle transitions for step changes, selected-card states, progress bars, upload success, and result reveal.
- Progress should be as real as provider APIs allow. If a provider lacks granular progress, map elapsed time and backend job state to honest staged progress text without implying exact provider percentages.

## Implementation Phases

## Implementation Review Notes

These are follow-up notes after the first Claude implementation pass and the subsequent fix pass:

- R2 source-upload readback is now handled server-side. VVS source uploads are saved through `src/lib/vvs-studio/source-storage.ts` and read back as byte attachments before provider calls.
- Source uploads now enforce a 15 MB size limit, MIME allowlist, magic-byte checks, and JPEG normalization through `sharp`.
- The advanced image provider/model selector now sends `{ provider, modelId }` to the generation endpoint, with `AppSetting` defaults as fallback.
- Shoot lifecycle status is now updated through generation: `generating_image`, `image_succeeded`, `image_finalized`, `generating_video`, `video_succeeded`, and `failed`.
- R2 source uploads now use internal `r2://...` image URLs for VVS storage. The shared generated-media helper still returns public URLs for generated images/videos, which is intentional.
- Autosave/immediate upload is still not implemented. The current wizard stores files locally and uploads them when the user starts generation.
- Share actions copy/share the generated URL, but the UI does not currently show a copied/success state.

### Phase 1: Skeleton And Navigation

Files:

- `app/owner/OwnerFrame.tsx`
- `app/owner/vvs-studio/page.tsx`
- `app/owner/vvs-studio/VvsStudioWizard.tsx`

Tasks:

- Add `VVS Studio` left nav item.
- Add demo-public route inside the owner shell.
- Build static stepper UI with local-only state.
- Match first-pass visuals from the screenshot.
- No backend yet.

Acceptance:

- `/owner/vvs-studio` is reachable without entering `ID8` for the public demo.
- Existing protected owner pages still require `ID8`.
- Sidebar shows `VVS Studio`.
- `/owner/vvs-studio` renders inside owner dashboard.
- Wizard can move through image and video steps locally with mocked success states.

### Phase 2: Data Model And Migration

Files:

- `prisma/schema.prisma`
- `prisma/schema.postgres.prisma`
- `src/server/db/schema.prisma`
- `prisma/migrations/<timestamp>_add_vvs_studio/`

Tasks:

- Add `VvsStudioShoot`.
- Add `VvsStudioUpload`.
- Add `VvsStudioImageGeneration`.
- Add `VvsStudioVideoGeneration`.
- Add relations to `Account`.
- Run `npx prisma generate`.

Acceptance:

- Prisma client exposes VVS Studio models.
- Migration applies locally.
- Existing tests/typecheck remain green.

### Phase 3: Owner APIs

Files:

- `app/api/owner/vvs-studio/shoots/route.ts`
- `app/api/owner/vvs-studio/shoots/[shootId]/route.ts`
- `app/api/owner/vvs-studio/shoots/[shootId]/uploads/route.ts`
- `app/api/owner/vvs-studio/shoots/[shootId]/uploads/[uploadId]/route.ts`
- `app/api/owner/vvs-studio/shoots/[shootId]/generate/route.ts`
- `app/api/owner/vvs-studio/shoots/[shootId]/finalize-image/route.ts`
- `app/api/owner/vvs-studio/generations/[generationId]/route.ts`
- `app/api/owner/vvs-studio/shoots/[shootId]/video/route.ts`
- `app/api/owner/vvs-studio/videos/[videoGenerationId]/route.ts`
- `app/api/owner/vvs-studio/model-settings/route.ts`

Tasks:

- Implement demo-public, account-scoped CRUD and uploads for VVS Studio.
- Add Zod validation.
- Ensure all lookups are scoped by account.
- Add route tests for auth, validation, ownership, and happy path.

Acceptance:

- Public demo VVS Studio requests work without owner auth and are scoped to the demo account.
- Existing non-VVS owner API requests still require owner auth.
- Draft shoot can be created.
- One to three uploads can be persisted.
- Uploads can be replaced and removed.
- Uploads reject unsupported content types and files over 15 MB.
- HEIC/HEIF uploads are converted to JPEG when conversion support is available.
- Shoot details can be patched.
- Image generation row can be created and polled.
- Video generation row can be created and polled.
- Model settings can be read and updated.

### Phase 4: Prompt Boundary, Image Generation, And Video Generation

Files:

- `src/lib/vvs-studio/types.ts`
- `src/lib/vvs-studio/prompt-builder.ts`
- `src/lib/vvs-studio/image-generator.ts`
- `src/lib/vvs-studio/video-generator.ts`
- `src/lib/vvs-studio/model-settings.ts`

Tasks:

- Add placeholder prompt builder.
- Add provider adapters for OpenAI and Gemini image generation.
- Add easy model switching through `AppSetting` defaults and per-generation provider/model fields.
- Attach all available uploaded images, one to three normalized JPEGs, to the generation call.
- Reuse existing Wavespeed video integration patterns for video generation.
- Persist image prompt, provider, model, image URL, status, error, and duration.
- Persist video prompt, Wavespeed model/provider job ID, remote URL, saved video URL, status, error, and duration.

Acceptance:

- Generate route creates a pending row immediately.
- Successful generation stores `imageUrl`.
- Video route creates a pending video row immediately.
- Successful video generation stores `videoUrl`.
- Failed generation stores `error`.
- Polling route reflects state accurately.

### Phase 5: Wire Wizard To Backend

Tasks:

- Create shoot on first forward action or before first upload.
- Upload each angle as soon as file is selected.
- Support replacing and removing uploaded images.
- Patch shoot details at Step 2 and Step 3.
- Start generation on `Generate Studio Asset`.
- Poll until success/failure.
- Show generated image result.
- Implement regenerate.
- Implement save image.
- Implement share image.
- Implement Finish Here/New Shoot from image result without video.
- Start video generation from the selected generated image.
- Poll until video success/failure.
- Show video result.
- Implement save video.
- Implement share video.

Acceptance:

- Owner can complete end-to-end image flow.
- Owner can complete image-to-video flow.
- Owner can stop after image generation and start a new shoot.
- Refreshing result route/state should not destroy saved DB records.
- Regeneration creates a second generation row.

### Phase 6: Asset History

Optional but important for a complete owner feature. Do not implement reopening/editing old shoots in V1 unless explicitly asked; V1 supports new shoots only.

- Add a right rail or lower section on `/owner/vvs-studio` showing recent VVS Studio shoots.
- Or create `/owner/vvs-studio/library`.
- Show piece type, style, status, generated thumbnail, created date.
- Later: allow reopening a shoot result.

### Phase 7: Tests

Unit/API tests:

- Owner nav contains `VVS Studio`.
- Unauthenticated VVS API calls are allowed for the public demo and scoped to the demo account.
- Existing non-VVS owner API calls still return 401 when unauthenticated.
- Create shoot accepts an empty draft body and validates visual style when provided.
- Patch shoot validates piece type and details fields.
- Upload route rejects missing/invalid angle.
- Upload route accepts JPEG, PNG, WebP, HEIC, and HEIF.
- Upload route converts accepted uploads to JPEG for provider use.
- Upload route rejects files larger than 15 MB.
- Upload route never stores the original filename directly.
- Patch route validates enum fields.
- Generate route rejects shoots with zero uploaded images.
- Generate route creates `VvsStudioImageGeneration`.
- Poll route returns status and image URL.
- Model settings route can switch between OpenAI and Gemini defaults.
- Image generation records store the selected provider and model ID.
- Video route rejects missing or failed image generations.
- Video route creates `VvsStudioVideoGeneration`.
- Video polling route returns status and video URL.
- Wavespeed failures are persisted on the video generation row.

Component tests:

- Wizard starts at Piece + Capture.
- Next disabled until at least one upload and a visual style are selected.
- Upload cards show guide art before upload and image previews after upload.
- Users can replace and remove uploaded images.
- Details form preserves data when navigating back.
- Theme + Format requires mood and aspect ratio.
- Theme + Format can switch image provider/model.
- Generating state transitions to result when polling succeeds.
- Regenerate calls generation endpoint again.
- Image result does not offer edit-after-generation in V1.
- Image result can finalize/end the shoot without video.
- Generate Video calls the Wavespeed-backed video endpoint.
- Video generating state transitions to video result when polling succeeds.

E2E smoke:

- Open `/owner/vvs-studio` without logging in.
- Upload one or more fixture images.
- Fill details.
- Choose Luxury + Square.
- Mock generation APIs.
- Confirm result screen appears.
- Click Regenerate and verify a second generation starts.
- Verify the user can start a new shoot from image result without video.
- Click Generate Video Reel.
- Mock Wavespeed video API/polling.
- Confirm video result screen appears and Save Video is available.

## File Checklist

Likely new files:

```text
app/owner/vvs-studio/page.tsx
app/owner/vvs-studio/VvsStudioWizard.tsx
app/owner/vvs-studio/components/AngleUploadCard.tsx
app/owner/vvs-studio/components/StepProgress.tsx
app/owner/vvs-studio/components/PieceDetailsForm.tsx
app/owner/vvs-studio/components/ThemeFormatStep.tsx
app/owner/vvs-studio/components/GenerationProgress.tsx
app/owner/vvs-studio/components/StudioResultCard.tsx
app/owner/vvs-studio/components/VideoResultCard.tsx
app/api/owner/vvs-studio/shoots/route.ts
app/api/owner/vvs-studio/shoots/[shootId]/route.ts
app/api/owner/vvs-studio/shoots/[shootId]/uploads/route.ts
app/api/owner/vvs-studio/shoots/[shootId]/uploads/[uploadId]/route.ts
app/api/owner/vvs-studio/shoots/[shootId]/generate/route.ts
app/api/owner/vvs-studio/shoots/[shootId]/finalize-image/route.ts
app/api/owner/vvs-studio/generations/[generationId]/route.ts
app/api/owner/vvs-studio/shoots/[shootId]/video/route.ts
app/api/owner/vvs-studio/videos/[videoGenerationId]/route.ts
app/api/owner/vvs-studio/model-settings/route.ts
src/lib/vvs-studio/types.ts
src/lib/vvs-studio/prompt-builder.ts
src/lib/vvs-studio/image-generator.ts
src/lib/vvs-studio/video-generator.ts
src/lib/vvs-studio/model-settings.ts
public/vvs-studio/
```

Likely edited files:

```text
app/owner/OwnerFrame.tsx
prisma/schema.prisma
prisma/schema.postgres.prisma
src/server/db/schema.prisma
```

## What Was Built — Implementation Record (Phases 1–5)

This section documents what was actually implemented, the concrete decisions made during implementation, and the things a future developer needs to understand before touching this code. Read this before making structural changes.

### Completion Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Navigation, page skeleton, wizard UI | Complete |
| 2 | Data model, Prisma schema, migration | Complete |
| 3 | All 10 API routes | Complete |
| 4 | `src/lib/vvs-studio/` generation layer | Complete |
| 5 | Wizard wired to backend | Complete |
| 6 | Asset history / library | Not started |
| 7 | Tests | Not started |

### Files Created or Modified

**New files:**

```text
app/owner/vvs-studio/page.tsx
app/owner/vvs-studio/types.ts
app/owner/vvs-studio/VvsStudioWizard.tsx
app/owner/vvs-studio/components/AngleUploadCard.tsx
app/owner/vvs-studio/components/StepProgress.tsx
app/owner/vvs-studio/components/GenerationProgress.tsx
app/owner/vvs-studio/components/StudioResultCard.tsx
app/owner/vvs-studio/components/VideoResultCard.tsx
app/api/owner/vvs-studio/shoots/route.ts
app/api/owner/vvs-studio/shoots/[shootId]/route.ts
app/api/owner/vvs-studio/shoots/[shootId]/uploads/route.ts
app/api/owner/vvs-studio/shoots/[shootId]/uploads/[uploadId]/route.ts
app/api/owner/vvs-studio/shoots/[shootId]/generate/route.ts
app/api/owner/vvs-studio/shoots/[shootId]/finalize-image/route.ts
app/api/owner/vvs-studio/shoots/[shootId]/video/route.ts
app/api/owner/vvs-studio/generations/[generationId]/route.ts
app/api/owner/vvs-studio/videos/[videoGenerationId]/route.ts
app/api/owner/vvs-studio/model-settings/route.ts
src/lib/vvs-studio/types.ts
src/lib/vvs-studio/prompt-builder.ts
src/lib/vvs-studio/image-generator.ts
src/lib/vvs-studio/video-generator.ts
src/lib/vvs-studio/model-settings.ts
public/vvs-studio/logo.png
public/vvs-studio/guide-top.jpg
public/vvs-studio/guide-left.jpg
public/vvs-studio/guide-right.jpg
prisma/migrations/20260519000000_add_vvs_studio/migration.sql
```

**Modified files:**

```text
app/owner/OwnerFrame.tsx             — added VVS Studio nav item
app/owner/studio/page.tsx            — added VVS Studio link card
prisma/schema.prisma                 — added 4 VVS models + Account relations
prisma/schema.postgres.prisma        — mirrored
src/server/db/schema.prisma          — mirrored
```

### Architecture Decisions A Future Developer Needs To Know

#### 1. Wizard state is `useReducer`, not `useState`

The wizard uses a single `VvsWizardState` object managed by `useReducer`. There is a typed `Action` union. This was chosen over multiple `useState` calls because wizard steps depend on each other (going back must not lose earlier fields, generating video requires shootId + imageGenerationId from earlier steps). Resist splitting this into separate state pieces. If you need to add a field, add it to `VvsWizardState` in `types.ts` and handle it with `SET_FIELD`.

There is no `SET_VISUAL_STYLE` action. It was removed during implementation because it duplicated `SET_FIELD`. Use `dispatch({ type: "SET_FIELD", field: "visualStyle", value: s.value })` like every other field.

#### 2. Shoot creation happens at generation time, not at upload time

The plan said to create the shoot before the first upload. This was not implemented. **The shoot is created when the user clicks Generate Studio Asset.** The wizard holds photos as local `File` objects in state (`uploads.top/left/right`) until generation is triggered. When Generate is clicked, `runImageGeneration()`:

1. POSTs `/api/owner/vvs-studio/shoots` → gets `shootId`
2. POSTs all photos to `/shoots/[shootId]/uploads` concurrently
3. PATCHes the shoot with all detail fields
4. POSTs to `/shoots/[shootId]/generate`
5. Polls `/generations/[generationId]` every 2.5 seconds

This means there is no draft shoot in the DB while the user fills in the wizard — only local browser state. If the user closes the tab mid-wizard, no draft is saved. If you want autosave, you need to add shoot creation back to the first upload event and wire the shootId into state early.

#### 3. Regenerate reuses the same shoot

When the user clicks Regenerate on the image result screen, `runImageGeneration(state.shootId)` is called with the existing shoot ID. It skips the create-shoot, upload, and patch steps and jumps straight to POSTing generate. This means a regeneration creates a second `VvsStudioImageGeneration` row on the same shoot. Previous generation rows are preserved. The wizard always shows the most recent successful generation URL.

#### 4. Cancellation uses `AbortController`

`runImageGeneration` and `runVideoGeneration` are async flows that run polls inside a loop. If the user resets the wizard mid-generation, the active `AbortController` is aborted. A new controller is created for every new flow via `cancelPending()` which is stored in a `useRef`. All `fetch` calls inside the generation flows pass the `signal`. This prevents stale polls from updating state after a reset. Do not remove this without ensuring polls cannot update the state of a new shoot session.

#### 5. Prisma relation names are PascalCase

The Prisma schema uses `Uploads`, `ImageGenerations`, and `VideoGenerations` (with capital first letters) as the relation fields on `VvsStudioShoot`. If you use `include: { uploads: true }` (lowercase), TypeScript will throw. The correct form is `include: { Uploads: true }`. This is consistent with how the schema was written; do not rename these without also updating the generate route and shoots list route.

#### 6. AppSetting key namespacing for VVS model settings

The rest of the app stores `AppSetting` rows with bare keys like `"name.prompt_mode"` using the `accountId` column to identify the tenant (defaulting to `"demo-account"`). VVS Studio model settings use a different pattern: keys are namespaced as `"${accountId}:${key}"` in the `key` field itself — e.g., `"demo-account:vvs_studio.image_provider"`. This is intentional: `AppSetting.key` is the sole primary key (`@id`), so per-account settings need the accountId embedded in the key to avoid collisions across future tenants. Do not change this to bare keys without also adding a compound unique constraint on `(accountId, key)` to the schema.

The `getVvsModelSettings` function loads all five settings in a single `findMany` query (not five separate `findUnique` calls). Keep it as one query.

#### 7. Image generation: provider path differences

`src/lib/vvs-studio/image-generator.ts` handles both providers:

- **Gemini:** Uploads attachments as base64 inline data in the prompt parts. Uses `@google/genai` `models.generateContent` with `responseModalities: ["IMAGE"]`. The API key env var is `GEMINI_API_KEY` (falls back to `GOOGLE_API_KEY`).

- **OpenAI:** When attachments exist (the normal case), uses `client.images.edit()` with the first attachment as the `image` parameter. When no attachments exist (edge case), falls back to `client.images.generate()`. Both use `response_format: "b64_json"`. The API key env var is `OPENAI_API_KEY`. The `openai` package is already installed at `^6.38.0`.

Neither provider supports multiple reference images natively in the same way. For Gemini, all three angle photos are sent as inline data parts in one prompt. For OpenAI `images.edit`, only the first attachment (top view) is used as the base image; the other angles are currently unused in the OpenAI path. If you need all three angles for OpenAI, investigate multi-image edit when that API becomes available.

#### 8. Source uploads stored at `/generated/vvs-studio/uploads/`

The plan specified private R2 storage for source uploads. The current implementation uses `src/lib/vvs-studio/source-storage.ts` for VVS source media instead of the generic public generated-media path. In production with R2 configured, uploads are written to R2 with a VVS-specific key and stored in the DB as an internal `r2://...` URL. The generation route reads the R2 object server-side and passes bytes to the image provider.

For local dev without R2, uploads still fall back to `GENERATED_IMAGE_DIR` under `vvs-studio/uploads/`, which usually resolves to `public/generated/vvs-studio/uploads/`. Treat that as a dev convenience, not a production privacy model.

The `resolveAttachmentPath` function in the generate route converts `/generated/vvs-studio/...` URLs to absolute filesystem paths (required for Gemini's `fs.readFile` approach). If you switch to R2 URLs, both Gemini and OpenAI paths accept remote HTTPS URLs directly — but you must remove the `fs.readFile` step from the Gemini path and switch to URL-based inline data fetching.

#### 9. Video source image must be a public URL

Wavespeed downloads the source image from the URL you supply. This means the generated image URL must be publicly reachable before calling the video route. The generate route saves the image locally or to R2 and stores the resulting URL. The video route calls `toPublicImageUrl(req, imageGen.imageUrl)` to resolve a local `/generated/...` path into an absolute URL using the request origin, then calls `assertPublicImageUrl()` to reject localhost. In local dev, video generation will fail unless `APP_BASE_URL` or `NEXT_PUBLIC_APP_URL` is set to a tunneled public URL (e.g., an ngrok endpoint).

#### 10. Prompt builder is intentionally barebones

`src/lib/vvs-studio/prompt-builder.ts` contains placeholder implementations. The user has explicitly stated they will supply the real prompt templates later. Do not elaborate or optimize the prompt functions until then. The boundary is in place so the generation layer compiles and runs; the actual prompt text is the part that needs replacement.

When replacing prompts, maintain the function signatures in `prompt-builder.ts`. Route handlers and tests reference these functions by name. The prompt text should still not be placed inside TypeScript strings in route handlers — per the project-wide rule, long prompt text stays in `.jsonp` template files or, for VVS Studio specifically, in the prompt builder module. This is a candidate for moving to `.txt`/`.md`/`.jsonp` files under `src/lib/vvs-studio/` when prompts grow complex.

#### 11. `VvsStudioUpload` upserts by angle, not insert

The upload route uses `findUnique` by `@@unique([shootId, angle])` and then either creates or updates. Uploading a new top-view photo when one already exists replaces it in the DB (updates storageKey, imageUrl, dimensions, etc.). The old file is not deleted from storage in V1. This means storage can accumulate orphaned files over time. Add a cleanup step or R2 lifecycle rule before deploying at scale.

#### 12. What the plan specified that is still not implemented

- **Autosave/debounce PATCH:** The plan called for debounced shoot patching after each field change. Not implemented. All data is persisted in a single batch at generation click time.
- **`getVvsStudioAccountIdForRequest` helper:** The plan recommended this extraction. The routes call `getDefaultAccountId()` directly. When adding real auth, find all `getDefaultAccountId()` calls inside `app/api/owner/vvs-studio/` and replace them.

### What Still Needs To Be Done

**Phase 6 — Asset history:** A panel or page at `/owner/vvs-studio/history` (or as a second tab on the main page) showing past shoots, their status, generated image thumbnails, and a way to download completed assets. The `GET /api/owner/vvs-studio/shoots` route exists and returns shoots with their most recent generation.

**Prompt templates:** Replace `buildVvsStudioImagePrompt` and `buildVvsStudioVideoPrompt` in `src/lib/vvs-studio/prompt-builder.ts` with real prompting when the user provides them.

**Tests:** All test scenarios from Phase 7 above are unwritten. Priority order: upload validation, generation happy path, account ownership checks, polling routes.

**Upload improvements:** Add dedicated route tests for the 15 MB maximum, MIME allowlist, magic-byte validation, and HEIC/HEIF host support behavior.

## Open Questions

1. Should generated images/videos later be exposed on public storefront profiles, or remain owner-only assets forever?
2. Should `Chainz` stay spelled that way in the production UI, matching the design, or should it be `Chains`?
3. Should price be rendered into the generated image, or only stored as metadata for the result card?
4. Do owners need multiple generated image variants per click, or one image per generation attempt?
5. Which OpenAI image model and Gemini image model should be the initial defaults?
6. Which Wavespeed video model should be the initial VVS Studio default?
7. Should video generation use the same aspect ratio as the image by default, or should video have its own ratio selector?
