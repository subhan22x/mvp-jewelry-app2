import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { generateImage } from "@/lib/styles/connector";
import { getDefaultAccountId } from "@/src/lib/account";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { withSignupGeneration, signupGenerationUserId, bindSignupGeneration } from "@/src/lib/billing/signup-credits";
import { requestNotificationAudience } from "@/src/lib/notifications/origin";
import { scheduleBackgroundTask } from "@/src/lib/platform/background";
import { directUploadReferenceSchema, readDirectUpload } from "@/src/lib/storage/direct-upload";
import { PublicTenantAccessError, resolveAccountIdFromSlug } from "@/src/lib/tenant";
import { consumeUsageCredit, ensureUsageAvailable, usageErrorResponse } from "@/src/lib/usage";
import { ensureDraftQuoteForRequest } from "@/src/lib/quotes/ensure-draft-quote";
import { QrKitAttributionError, resolveQrKitAttributionFromRequest } from "@/src/lib/qr-kits/service";
import { LOGO_COLOR_COMBOS, LOGO_UPLOAD_MAX_BYTES, LOGO_UPLOAD_TYPES } from "@/src/lib/logo-pendants/config";
import { LogoSettingsSchema, buildLogoPendantPrompt } from "@/src/lib/logo-pendants/prompt";

import { buildLogoPendantAttachments } from "@/src/lib/logo-pendants/attachments";

export const maxDuration = 300;

const Body = LogoSettingsSchema.extend({
  userId: z.string().min(1).max(240),
  accountSlug: z.string().min(1).max(240).optional(),
  imageUpload: directUploadReferenceSchema.optional()
});

const jsonError = (error: string, status = 400) => NextResponse.json({ error }, { status });
const removeTempDir = async (directory: string | null) => {
  if (directory) await fs.rm(directory, { recursive: true, force: true }).catch(() => {});
};

export const POST = withSignupGeneration(async function POST(req: Request) {
  let tempDir: string | null = null;
  try {
    const isJson = req.headers.get("content-type")?.includes("application/json");
    const form = isJson ? null : await req.formData();
    const body = Body.parse(isJson ? await req.json() : {
      userId: form!.get("userId"),
      accountSlug: form!.get("accountSlug") || undefined,
      shape: form!.get("shape"),
      colorCombo: form!.get("colorCombo"),
      additionalText: form!.get("additionalText") || "",
      size: form!.get("size"),
      stoneType: form!.get("stoneType"),
      diamondQuality: form!.get("diamondQuality"),
      metalType: form!.get("metalType")
    });
    const directImage = body.imageUpload;
    const imageValue = form?.get("image");
    const image = imageValue instanceof File ? imageValue : null;
    if (directImage && !directImage.key.startsWith("incoming/logo-pendant/")) {
      return jsonError("Uploaded file purpose does not match this request.");
    }
    if (!directImage && !image) return jsonError("Please upload a logo image.");
    const imageType = directImage?.contentType ?? image!.type;
    const imageSize = directImage?.size ?? image!.size;
    const imageName = directImage?.originalName ?? image!.name;
    if (!(LOGO_UPLOAD_TYPES as readonly string[]).includes(imageType)) return jsonError("Please upload a supported logo image (PNG, JPG, WebP, GIF, HEIC, or HEIF).");
    if (imageSize <= 0) return jsonError("Uploaded logo image is empty.");
    if (imageSize > LOGO_UPLOAD_MAX_BYTES) return jsonError("Logo image must be 10MB or smaller.");

    const accountId = await resolveAccountIdFromSlug(body.accountSlug)
      ?? (await getOwnerContext())?.accountId ?? getDefaultAccountId();
    const qrKitAttribution = await resolveQrKitAttributionFromRequest(req, body.accountSlug);
    await ensureUsageAvailable(accountId, "design_image_generated", 1);

    const imageBuffer = directImage ? (await readDirectUpload(directImage)).buffer : Buffer.from(await image!.arrayBuffer());
    if (imageBuffer.length <= 0 || imageBuffer.length > LOGO_UPLOAD_MAX_BYTES) return jsonError("Logo image must be nonempty and 10MB or smaller.");
    // Decode real image bytes and normalize uploads before the provider sees them.
    let normalized: Buffer;
    try {
      const decoded = sharp(imageBuffer, { limitInputPixels: 25_000_000 });
      const metadata = await decoded.metadata();
      if (!metadata.format || !["jpeg", "png", "webp", "gif", "heif"].includes(metadata.format)) {
        return jsonError("Please upload a supported logo image (PNG, JPG, WebP, GIF, HEIC, or HEIF).");
      }
      normalized = await decoded.rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
        .png().toBuffer();
    } catch {
      return jsonError("Unable to read this logo image. Please upload a PNG, JPG, or WebP image.");
    }

    const prompt = buildLogoPendantPrompt(body);
    const colors = LOGO_COLOR_COMBOS[body.colorCombo];
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "logo-pendant-"));
    const logoPath = path.join(tempDir, "logo.png");
    await fs.writeFile(logoPath, normalized);
    const attachments = buildLogoPendantAttachments(logoPath, body.shape);

    const request = await prisma.request.create({
      data: {
        notificationAudience: await requestNotificationAudience(accountId),
        accountId,
        qrKitId: qrKitAttribution.qrKitId,
        userId: signupGenerationUserId(body.userId),
        productType: "logo",
        styleId: `logo_${body.shape}`,
        text: body.additionalText || imageName,
        twoTone: colors.secondaryMetal !== null,
        primaryMetal: colors.primaryMetal,
        secondaryMetal: colors.secondaryMetal,
        emblem: "none",
        size: body.size,
        metalType: body.metalType,
        stoneType: body.stoneType,
        diamondQuality: body.diamondQuality,
        uploadFileName: imageName
      }
    });
    const attempt = await prisma.result.create({
      data: {
        accountId,
        requestId: request.id,
        variant: 1,
        prompt,
        status: "pending",
        startedAt: new Date(),
        attachmentPathsJson: JSON.stringify(attachments)
      }
    });
    await bindSignupGeneration(request.id);
    const generationTempDir = tempDir;
    tempDir = null;

    scheduleBackgroundTask((async () => {
      const startedMs = attempt.startedAt?.getTime() ?? Date.now();
      try {
        const { imageUrl, modelId } = await generateImage({
          prompt,
          attachments,
          requestId: request.id,
          variant: 1,
          modelIdOverride: "gemini-3.1-flash-image"
        });
        const completedAt = new Date();
        const updated = await prisma.result.update({
          where: { id: attempt.id },
          data: { imageUrl, modelId, status: "succeeded", error: null, completedAt, durationMs: Math.max(0, completedAt.getTime() - startedMs) }
        });
        await consumeUsageCredit({
          accountId,
          kind: "design_image_generated",
          sourceType: "Result",
          sourceId: updated.id,
          metadata: { requestId: request.id, productType: "logo", variant: 1 }
        }).catch(error => {
          console.error(`[logo request ${request.id}] usage tracking failed:`, error);
        });
        await ensureDraftQuoteForRequest(request.id).catch(error => {
          console.error(`[quote draft ${request.id}] automatic creation failed:`, error);
        });
      } catch (error) {
        console.error("[logo pendant] generation failed:", error);
        const completedAt = new Date();
        await prisma.result.update({
          where: { id: attempt.id },
          data: { status: "failed", error: "Logo pendant generation failed. Please try again.", completedAt, durationMs: Math.max(0, completedAt.getTime() - startedMs) }
        });
      } finally {
        await removeTempDir(generationTempDir);
      }
    })(), `logo-request:${request.id}`);
    return NextResponse.json({ requestId: request.id }, { status: 201 });
  } catch (error) {
    await removeTempDir(tempDir);
    if (error instanceof QrKitAttributionError) return jsonError(error.message, error.status);
    if (error instanceof PublicTenantAccessError) return jsonError(error.message, error.status);
    const usage = usageErrorResponse(error);
    if (usage) return jsonError(usage.error, 402);
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return jsonError(error instanceof z.ZodError ? error.issues[0]?.message ?? "Invalid logo pendant request." : "Invalid logo pendant request.");
    }
    console.error("[logo pendant] request failed:", error);
    return jsonError("Unable to start logo pendant generation. Please try again.", 500);
  }
});
