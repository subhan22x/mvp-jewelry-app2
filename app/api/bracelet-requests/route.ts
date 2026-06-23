import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { generateImage } from "@/lib/styles/connector";
import { getDefaultAccountId } from "@/src/lib/account";
import { scheduleBackgroundTask } from "@/src/lib/platform/background";
import { resolveAccountIdFromSlug } from "@/src/lib/tenant";
import { consumeUsageCredit, ensureUsageAvailable, usageErrorResponse } from "@/src/lib/usage";
import { ensureDraftQuoteForRequest } from "@/src/lib/quotes/ensure-draft-quote";

export const maxDuration = 300;

const BRACELET_STYLES = {
  style_1: "public/bracelets/styles/icedout-bracelet-1.png",
  style_2: "public/bracelets/styles/icedout-bracelet-2.png",
  style_3: "public/bracelets/styles/icedout-bracelet-3.png",
  style_4: "public/bracelets/styles/icedout-bracelet-4.png",
  womens_1: "public/bracelets/styles/womens-bracelet-1.webp",
  womens_2: "public/bracelets/styles/womens-bracelet-2.webp"
} as const;

const COLOR_LABELS = {
  rose_gold: "Rose gold",
  yellow_gold: "Yellow Gold",
  white: "White"
} as const;

const Body = z.object({
  productLine: z.enum(["icedout", "womens"]).default("icedout"),
  userId: z.string(),
  accountSlug: z.string().min(1).optional(),
  text: z.string().min(1),
  styleId: z.enum(["style_1", "style_2", "style_3", "style_4", "womens_1", "womens_2"]),
  colorCombo: z.enum(["rose_gold", "yellow_gold", "white"]),
  stoneType: z.enum(["natural_diamonds", "lab_diamonds", "moissanite", "cz"]).optional(),
  diamondQuality: z.enum(["vs", "vvs"]).optional(),
  metalType: z.enum(["gold", "silver"])
}).superRefine((body, ctx) => {
  const lines = body.text.split("\n").map(line => line.trim()).filter(Boolean);
  if (!lines.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["text"], message: "Bracelet text is required." });
  }
  if (body.productLine === "icedout" && !["style_1", "style_2", "style_3", "style_4"].includes(body.styleId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["styleId"], message: "Choose an icedout bracelet style." });
  }
  if (body.productLine === "womens" && !["womens_1", "womens_2"].includes(body.styleId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["styleId"], message: "Choose a women's bracelet style." });
  }
  if (body.productLine === "icedout" && lines.length > 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["text"], message: "Icedout bracelet text can be at most 2 lines." });
  }
  lines.forEach((line, index) => {
    if (body.productLine === "icedout" && line.length > 8) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["text", index], message: "Each bracelet text line must be 8 letters or fewer." });
    }
    if (body.productLine === "womens" && line.length > 24) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["text", index], message: "Bracelet text must be 24 characters or fewer." });
    }
  });
});

function buildIcedoutBraceletPrompt(text: string, colorCombo: string) {
  return `You are customizing a custom jewelry icedout bracelet

Keep the same style of the bracelet, including the VVS diamond stones and the construction. The diamonds shine under studio lighting

change the text to ${text}


and the color combo to ${colorCombo}


make the background of the image suede black, the bracelet laying flat on the surface`;
}

function buildWomensBraceletPrompt(text: string, colorCombo: string) {
  return `You are customizing a custom jewelry bracelet

Keep the same style of the bracelet, and the same font

just change the text to ${text}


and the color combo of the bracelet to ${colorCombo} `;
}

function getGenerationErrorMessage(err: unknown) {
  if (!(err instanceof Error)) return "Image generation failed.";
  return err.message || "Image generation failed.";
}

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const accountId = await resolveAccountIdFromSlug(body.accountSlug) ?? getDefaultAccountId();
    await ensureUsageAvailable(accountId, "design_image_generated", 1);

    const isWomens = body.productLine === "womens";
    const text = body.text.split("\n").map(line => line.trim()).filter(Boolean).join(isWomens ? " " : "\n");
    const prompt = isWomens
      ? buildWomensBraceletPrompt(text, COLOR_LABELS[body.colorCombo])
      : buildIcedoutBraceletPrompt(text, COLOR_LABELS[body.colorCombo]);
    const attachmentPath = path.join(process.cwd(), BRACELET_STYLES[body.styleId]);

    const request = await prisma.request.create({
      data: {
        accountId,
        userId: body.userId,
        productType: "bracelet",
        pendantFinish: isWomens ? "womens" : "icedout",
        styleId: `bracelet_${body.styleId}`,
        text,
        twoTone: false,
        primaryMetal: body.colorCombo === "white" ? "white_gold" : body.colorCombo === "yellow_gold" ? "yellow_gold" : "rose_gold",
        secondaryMetal: null,
        emblem: "none",
        size: null,
        metalType: body.metalType,
        stoneType: isWomens ? null : body.stoneType,
        diamondQuality: isWomens ? null : body.diamondQuality
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
        attachmentPathsJson: JSON.stringify([attachmentPath])
      }
    });

    scheduleBackgroundTask((async () => {
      const startedMs = attempt.startedAt?.getTime() ?? Date.now();
      try {
        const { imageUrl, modelId } = await generateImage({
          prompt,
          attachments: [attachmentPath],
          requestId: request.id,
          variant: 1,
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
          metadata: { requestId: request.id, productType: "bracelet", productLine: body.productLine, variant: 1 }
        });
        await ensureDraftQuoteForRequest(request.id).catch(error => {
          console.error(`[quote draft ${request.id}] automatic creation failed:`, error);
        });
      } catch (err) {
        console.error("[bracelet] generation failed:", err);
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
      }
    })(), `bracelet-request:${request.id}`);

    return NextResponse.json({ requestId: request.id }, { status: 201 });
  } catch (err: unknown) {
    const usage = usageErrorResponse(err);
    if (usage) return NextResponse.json(usage, { status: 402 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "bad_request" }, { status: 400 });
  }
}
