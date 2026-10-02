import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import mime from "mime";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { generateImage } from "@/lib/styles/connector";
import { getDefaultAccountId } from "@/src/lib/account";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { scheduleBackgroundTask } from "@/src/lib/platform/background";
import { ensureDraftQuoteForRequest } from "@/src/lib/quotes/ensure-draft-quote";
import { directUploadReferenceSchema, readDirectUpload } from "@/src/lib/storage/direct-upload";
import { resolveAccountIdFromSlug } from "@/src/lib/tenant";
import { consumeUsageCredit, ensureUsageAvailable, usageErrorResponse } from "@/src/lib/usage";
import {
  NECKLACE_METAL_LABELS,
  NECKLACE_STONE_LABELS,
  NECKLACE_STYLES,
  type NecklaceMetalColor,
  type NecklaceStyleId,
  necklaceReferencePath,
  necklaceReferenceUrl
} from "@/src/lib/necklaces/config";
import { buildNecklacePrompt } from "@/src/lib/necklaces/prompt";
import { QrKitAttributionError, resolveQrKitAttributionFromRequest } from "@/src/lib/qr-kits/service";

export const maxDuration = 300;

const MAX_UPLOAD_BYTES = Number(process.env.NECKLACE_PENDANT_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
const styleIds = NECKLACE_STYLES.map(style => style.id) as [string, ...string[]];

const Body = z.object({
  userId: z.string().min(1),
  accountSlug: z.string().min(1).optional(),
  styleId: z.enum(styleIds),
  metalColor: z.enum(["yellow_gold", "white_gold", "rose_gold"]),
  size: z.enum(["18", "20", "22", "30"]),
  stoneType: z.enum(["vvs_moissanite", "natural_diamond", "lab_diamond", "cz"]),
  budgetMinCents: z.coerce.number().int().min(0).optional(),
  budgetMaxCents: z.coerce.number().int().min(0).optional(),
  pendantUpload: directUploadReferenceSchema.optional(),
  customerName: z.string().trim().min(1).max(100).optional(),
  customerPhone: z.string().trim().min(4).max(30).optional(),
  customerEmail: z.string().trim().email().optional()
}).superRefine((body, ctx) => {
  if (body.budgetMinCents !== undefined && body.budgetMaxCents !== undefined && body.budgetMinCents > body.budgetMaxCents) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["budgetMinCents"], message: "Minimum budget must be less than maximum budget." });
  }
  const contactFields = [body.customerName, body.customerPhone, body.customerEmail].filter(Boolean);
  if (contactFields.length > 0 && contactFields.length < 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["customerName"], message: "Name, phone, and email are required together." });
  }
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getGenerationErrorMessage(err: unknown) {
  if (!(err instanceof Error)) return "Image generation failed.";
  return err.message || "Image generation failed.";
}

function uploadExtension(file: { name: string; type: string }) {
  const fromMime = mime.getExtension(file.type);
  if (fromMime) return fromMime;

  const fromName = path.extname(file.name).replace(/^\./, "").toLowerCase();
  return fromName || "png";
}

async function removeTempDir(tempDir: string | null) {
  if (!tempDir) return;
  await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
}

function parseBody(isJson: boolean, json: any, form: FormData | null) {
  if (isJson) return Body.parse(json);

  const uploadValue = form!.get("pendantUpload");
  return Body.parse({
    userId: form!.get("userId"),
    accountSlug: form!.get("accountSlug") || undefined,
    styleId: form!.get("styleId"),
    metalColor: form!.get("metalColor"),
    size: form!.get("size"),
    stoneType: form!.get("stoneType"),
    budgetMinCents: form!.get("budgetMinCents") || undefined,
    budgetMaxCents: form!.get("budgetMaxCents") || undefined,
    pendantUpload: typeof uploadValue === "string" && uploadValue.trim() ? JSON.parse(uploadValue) : undefined,
    customerName: form!.get("customerName") || undefined,
    customerPhone: form!.get("customerPhone") || undefined,
    customerEmail: form!.get("customerEmail") || undefined
  });
}

async function createLeadIfPresent(input: z.infer<typeof Body>, accountId: string, requestId: string, qrKitId: string | null) {
  if (!input.customerName || !input.customerPhone || !input.customerEmail) return;
  await prisma.lead.create({
    data: {
      accountId,
      requestId,
      qrKitId,
      name: input.customerName,
      phone: input.customerPhone,
      email: input.customerEmail
    }
  });
}

async function resolveNecklaceAccountId(accountSlug: string | undefined) {
  const slugAccountId = await resolveAccountIdFromSlug(accountSlug);
  if (slugAccountId) return slugAccountId;

  const ownerContext = await getOwnerContext();
  return ownerContext?.accountId ?? getDefaultAccountId();
}

export async function POST(req: Request) {
  let tempDir: string | null = null;

  try {
    const isJson = req.headers?.get?.("content-type")?.includes("application/json") ?? false;
    const form = isJson ? null : await req.formData();
    const json = isJson ? await req.json() : null;
    const body = parseBody(isJson, json, form);
    const style = NECKLACE_STYLES.find(candidate => candidate.id === body.styleId);
    if (!style) return jsonError("Choose a valid necklace style.");

    const styleId = body.styleId as NecklaceStyleId;
    const metalColor = body.metalColor as NecklaceMetalColor;
    const referenceUrl = necklaceReferenceUrl(styleId, metalColor);
    const referencePath = necklaceReferencePath(styleId, metalColor);
    if (!referenceUrl || !referencePath) return jsonError("Necklace reference image is not configured.");

    const accountId = await resolveNecklaceAccountId(body.accountSlug);
    const qrKitAttribution = await resolveQrKitAttributionFromRequest(req, body.accountSlug);
    const formPendant = form?.get("pendantImage");
    const hasFormPendant = formPendant instanceof File && formPendant.size > 0;
    const hasPendant = Boolean(body.pendantUpload || hasFormPendant);
    if (hasPendant) await ensureUsageAvailable(accountId, "design_image_generated", 1);

    let pendantImagePath: string | null = null;
    let pendantImageName: string | null = null;
    if (hasPendant) {
      const directImage = body.pendantUpload;
      const image = hasFormPendant ? formPendant : null;
      const imageType = directImage?.contentType ?? image!.type;
      const imageSize = directImage?.size ?? image!.size;
      const imageName = directImage?.originalName ?? image!.name;
      if (directImage && !directImage.key.startsWith("incoming/necklace-pendant/")) {
        return jsonError("Uploaded file purpose does not match this request.");
      }
      if (!imageType.startsWith("image/")) return jsonError("Uploaded pendant must be an image.");
      if (imageSize <= 0) return jsonError("Uploaded pendant image is empty.");
      if (imageSize > MAX_UPLOAD_BYTES) {
        return jsonError(`Uploaded pendant image must be ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB or smaller.`);
      }

      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "necklace-pendant-"));
      pendantImageName = imageName;
      pendantImagePath = path.join(tempDir, `pendant.${uploadExtension({ name: imageName, type: imageType })}`);
      const imageBuffer = directImage ? (await readDirectUpload(directImage)).buffer : Buffer.from(await image!.arrayBuffer());
      await fs.writeFile(pendantImagePath, imageBuffer);
    }

    const text = `${style.label} necklace`;
    const prompt = hasPendant
      ? buildNecklacePrompt({ metalColor })
      : `Static necklace reference for ${style.label} in ${NECKLACE_METAL_LABELS[body.metalColor]}.`;

    const request = await prisma.request.create({
      data: {
        accountId,
        qrKitId: qrKitAttribution.qrKitId,
        userId: body.userId,
        productType: "necklace",
        pendantFinish: hasPendant ? "pendant_attached" : "chain_only",
        styleId: `necklace_${body.styleId}`,
        text,
        twoTone: false,
        primaryMetal: body.metalColor,
        secondaryMetal: null,
        emblem: "none",
        size: body.size,
        metalType: "gold",
        stoneType: body.stoneType,
        diamondQuality: body.stoneType === "vvs_moissanite" ? "vvs" : null,
        uploadFileName: pendantImageName,
        budgetMinCents: body.budgetMinCents ?? null,
        budgetMaxCents: body.budgetMaxCents ?? null
      }
    });

    await createLeadIfPresent(body, accountId, request.id, qrKitAttribution.qrKitId);

    if (!hasPendant) {
      const completedAt = new Date();
      const result = await prisma.result.create({
        data: {
          accountId,
          requestId: request.id,
          variant: 1,
          prompt,
          imageUrl: referenceUrl,
          modelId: "static-necklace-reference-v1",
          status: "succeeded",
          startedAt: completedAt,
          completedAt,
          durationMs: 0,
          attachmentPathsJson: JSON.stringify([referencePath])
        }
      });
      const ensured = await ensureDraftQuoteForRequest(request.id);
      return NextResponse.json({
        requestId: request.id,
        resultId: result.id,
        imageUrl: referenceUrl,
        generated: false,
        quoteRequestId: ensured.ok ? ensured.quoteRequestId : null
      }, { status: 201 });
    }

    const attempt = await prisma.result.create({
      data: {
        accountId,
        requestId: request.id,
        variant: 1,
        prompt,
        status: "pending",
        startedAt: new Date(),
        attachmentPathsJson: JSON.stringify([referencePath])
      }
    });

    const tempDirForGeneration = tempDir;
    const pendantPathForGeneration = pendantImagePath!;
    tempDir = null;

    scheduleBackgroundTask((async () => {
      const startedMs = attempt.startedAt?.getTime() ?? Date.now();
      try {
        const { imageUrl, modelId } = await generateImage({
          prompt,
          attachments: [referencePath, pendantPathForGeneration],
          requestId: request.id,
          variant: 1,
          modelIdOverride: "gemini-3.1-flash-image",
          onPreparedAttachments: async attachments => {
            await prisma.result.update({
              where: { id: attempt.id },
              data: { attachmentPathsJson: JSON.stringify(attachments) }
            });
          }
        });
        const completedAt = new Date();
        const updated = await prisma.result.update({
          where: { id: attempt.id },
          data: {
            imageUrl,
            modelId,
            status: "succeeded",
            error: null,
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedMs)
          }
        });
        await consumeUsageCredit({
          accountId,
          kind: "design_image_generated",
          sourceType: "Result",
          sourceId: updated.id,
          metadata: { requestId: request.id, productType: "necklace", variant: 1 }
        });
        await ensureDraftQuoteForRequest(request.id).catch(error => {
          console.error(`[quote draft ${request.id}] automatic creation failed:`, error);
        });
      } catch (err) {
        console.error("[necklace] generation failed:", err);
        const completedAt = new Date();
        await prisma.result.update({
          where: { id: attempt.id },
          data: {
            status: "failed",
            error: getGenerationErrorMessage(err),
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedMs)
          }
        });
      } finally {
        await removeTempDir(tempDirForGeneration);
      }
    })(), `necklace-request:${request.id}`);

    return NextResponse.json({
      requestId: request.id,
      resultId: attempt.id,
      imageUrl: referenceUrl,
      generated: true,
      quoteRequestId: null
    }, { status: 201 });
  } catch (err: unknown) {
    await removeTempDir(tempDir);
    if (err instanceof QrKitAttributionError) return jsonError(err.message, err.status);
    const usage = usageErrorResponse(err);
    if (usage) return jsonError(usage.error, 402);
    const message = err instanceof z.ZodError ? err.issues[0]?.message ?? "Invalid necklace request." : err instanceof Error ? err.message : "bad_request";
    return jsonError(message);
  }
}
