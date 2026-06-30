import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import mime from "mime";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { generateImage } from "@/lib/styles/connector";
import { getDefaultAccountId } from "@/src/lib/account";
import { scheduleBackgroundTask } from "@/src/lib/platform/background";
import { ensureDraftQuoteForRequest } from "@/src/lib/quotes/ensure-draft-quote";
import { resolveAccountIdFromSlug } from "@/src/lib/tenant";
import { consumeUsageCredit, ensureUsageAvailable, usageErrorResponse } from "@/src/lib/usage";
import {
  GRILLZ_DIAMOND_QUALITIES,
  GRILLZ_GOLD_COLORS,
  GRILLZ_STONE_TYPES,
  GRILLZ_STYLES,
  GRILLZ_TEETH
} from "@/src/lib/grillz/config";
import { buildGrillzPrompt } from "@/src/lib/grillz/prompt";

export const maxDuration = 300;

const MAX_UPLOAD_BYTES = Number(process.env.GRILLZ_UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024);
const styleIds = GRILLZ_STYLES.map(style => style.id) as [string, ...string[]];
const goldColorIds = GRILLZ_GOLD_COLORS.map(color => color.id) as [string, ...string[]];
const stoneTypeIds = GRILLZ_STONE_TYPES.map(stone => stone.id) as [string, ...string[]];
const diamondQualityIds = GRILLZ_DIAMOND_QUALITIES.map(quality => quality.id) as [string, ...string[]];
const validToothIds = new Set(GRILLZ_TEETH.map(tooth => tooth.id));
const CUSTOM_GRILLZ_STYLE_ID = "custom_inspiration";

const Body = z.object({
  userId: z.string(),
  accountSlug: z.string().min(1).optional(),
  styleId: z.enum(styleIds),
  selectedTeeth: z.array(z.string()).min(1, "Choose at least one tooth."),
  presetId: z.string().nullable().optional(),
  goldColor: z.enum(goldColorIds),
  stoneType: z.enum(stoneTypeIds),
  diamondQuality: z.enum(diamondQualityIds),
  inspiration: z.string().max(500).optional()
}).superRefine((body, ctx) => {
  body.selectedTeeth.forEach((toothId, index) => {
    if (!validToothIds.has(toothId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["selectedTeeth", index], message: "Choose a valid tooth." });
    }
  });
});

function labelFor<T extends { id: string; label: string }>(items: T[], id: string) {
  return items.find(item => item.id === id)?.label ?? id;
}

function summaryForTeeth(toothIds: string[]) {
  const selected = GRILLZ_TEETH.filter(tooth => toothIds.includes(tooth.id));
  const upper = selected.filter(tooth => tooth.arch === "upper").map(tooth => tooth.position);
  const lower = selected.filter(tooth => tooth.arch === "lower").map(tooth => tooth.position);
  const parts = [
    upper.length ? `upper teeth ${upper.join(", ")}` : null,
    lower.length ? `lower teeth ${lower.join(", ")}` : null
  ].filter(Boolean);
  return parts.join("; ");
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

export async function POST(req: Request) {
  let tempDir: string | null = null;

  try {
    const isJson = req.headers?.get?.("content-type")?.includes("application/json");
    const form = isJson ? null : await req.formData();
    const json = isJson ? await req.json() : null;
    const body = Body.parse(isJson ? json : {
      userId: form!.get("userId"),
      accountSlug: form!.get("accountSlug") || undefined,
      styleId: form!.get("styleId"),
      selectedTeeth: JSON.parse(String(form!.get("selectedTeeth") ?? "[]")),
      presetId: form!.get("presetId") || null,
      goldColor: form!.get("goldColor"),
      stoneType: form!.get("stoneType"),
      diamondQuality: form!.get("diamondQuality"),
      inspiration: form!.get("inspiration") || undefined
    });
    const accountId = await resolveAccountIdFromSlug(body.accountSlug) ?? getDefaultAccountId();
    await ensureUsageAvailable(accountId, "design_image_generated", 1);

    let inspirationImagePath: string | null = null;
    let inspirationImageName: string | null = null;
    if (body.styleId === CUSTOM_GRILLZ_STYLE_ID) {
      const imageValue = form?.get("inspirationImage");
      if (!imageValue || typeof imageValue === "string") {
        throw new Error("Upload an inspiration image for custom Grillz.");
      }
      if (!imageValue.type.startsWith("image/")) {
        throw new Error("Uploaded inspiration must be an image.");
      }
      if (imageValue.size <= 0) {
        throw new Error("Uploaded inspiration image is empty.");
      }
      if (imageValue.size > MAX_UPLOAD_BYTES) {
        throw new Error(`Uploaded inspiration image must be ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB or smaller.`);
      }
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "grillz-inspiration-"));
      inspirationImageName = imageValue.name;
      inspirationImagePath = path.join(tempDir, `inspiration.${uploadExtension({ name: imageValue.name, type: imageValue.type })}`);
      await fs.writeFile(inspirationImagePath, Buffer.from(await imageValue.arrayBuffer()));
    }

    const styleLabel = labelFor(GRILLZ_STYLES, body.styleId);
    const goldLabel = labelFor(GRILLZ_GOLD_COLORS, body.goldColor);
    const stoneLabel = labelFor(GRILLZ_STONE_TYPES, body.stoneType);
    const teethSummary = summaryForTeeth(body.selectedTeeth);
    const prompt = await buildGrillzPrompt({
      styleLabel,
      teethSummary,
      goldColor: goldLabel,
      stoneType: stoneLabel,
      diamondQuality: body.diamondQuality.toUpperCase(),
      inspiration: body.inspiration?.trim() ?? ""
    });
    const attachments = inspirationImagePath ? [inspirationImagePath] : [];

    const request = await prisma.request.create({
      data: {
        accountId,
        userId: body.userId,
        productType: "grillz",
        pendantFinish: "grillz",
        styleId: `grillz_${body.styleId}`,
        text: `${styleLabel} - ${teethSummary}`,
        twoTone: false,
        primaryMetal: body.goldColor,
        secondaryMetal: null,
        emblem: "none",
        size: null,
        metalType: "gold",
        stoneType: body.stoneType,
        diamondQuality: body.diamondQuality,
        grillzStyleType: body.styleId === CUSTOM_GRILLZ_STYLE_ID ? "custom" : "preset",
        grillzStyleLabel: styleLabel,
        grillzTeethJson: JSON.stringify({
          presetId: body.presetId ?? null,
          selectedTeeth: GRILLZ_TEETH.filter(tooth => body.selectedTeeth.includes(tooth.id))
        }),
        grillzInspiration: body.inspiration?.trim() || inspirationImageName || null
      }
    });

    const attempt = await prisma.result.create({
      data: {
        accountId,
        requestId: request.id,
        variant: 1,
        prompt,
        status: "pending",
        startedAt: new Date()
      }
    });

    const tempDirForGeneration = tempDir;
    tempDir = null;

    scheduleBackgroundTask((async () => {
      const startedMs = attempt.startedAt?.getTime() ?? Date.now();
      try {
        const { imageUrl, modelId } = await generateImage({
          prompt,
          attachments,
          requestId: request.id,
          variant: 1
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
          metadata: { requestId: request.id, productType: "grillz", variant: 1 }
        });
        await ensureDraftQuoteForRequest(request.id).catch(error => {
          console.error(`[quote draft ${request.id}] automatic creation failed:`, error);
        });
      } catch (err) {
        console.error("[grillz] generation failed:", err);
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
    })(), `grillz-request:${request.id}`);

    return NextResponse.json({ requestId: request.id }, { status: 201 });
  } catch (err: unknown) {
    await removeTempDir(tempDir);
    const usage = usageErrorResponse(err);
    if (usage) return NextResponse.json(usage, { status: 402 });
    const message = err instanceof z.ZodError ? err.issues[0]?.message ?? "Invalid Grillz request." : err instanceof Error ? err.message : "bad_request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
