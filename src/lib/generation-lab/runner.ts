import path from "node:path";
import { prisma } from "@/server/db/client";
import { buildVariants } from "@/lib/styles/builder";
import { generateImage } from "@/lib/styles/connector";
import { inspectStyle } from "@/src/lib/styles/inspect";
import { getNamePromptMode } from "@/src/lib/prompt-mode";
import { loadStyleOverride } from "@/src/lib/styles/style-overrides";
import {
  type BraceletCaseConfig,
  type CaseStatus,
  type LabCaseConfig,
  type NameCaseConfig,
  expectedGenerationsForFamily,
  familyIsWired,
  parseCaseConfig
} from "./types";
import { buildCaseStyleOverride } from "./prompt-overrides";

function selectedModelForVariant(config: { modelSelection?: { variant1?: string; variant2?: string } }, variant: number) {
  const modelId = variant === 1 ? config.modelSelection?.variant1 : config.modelSelection?.variant2;
  return modelId as "gemini-2.5-flash-image" | "gemini-3.1-flash-image" | "gemini-3-pro-image-preview" | undefined;
}

// Mirror of the bracelet prompt builders in app/api/bracelet-requests/route.ts.
// Kept here so the lab exercises the real customer prompt path without
// duplicating the inline prompt text into the lab UI/TS layer.
const BRACELET_STYLES = {
  style_1: "public/bracelets/styles/icedout-bracelet-1.png",
  style_2: "public/bracelets/styles/icedout-bracelet-2.png",
  style_3: "public/bracelets/styles/icedout-bracelet-3.png",
  style_4: "public/bracelets/styles/icedout-bracelet-4.png",
  womens_1: "public/bracelets/styles/womens-bracelet-1.webp",
  womens_2: "public/bracelets/styles/womens-bracelet-2.webp"
} as const;

const BRACELET_COLOR_LABELS = {
  rose_gold: "Rose gold",
  yellow_gold: "Yellow Gold",
  white: "White"
} as const;

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

function getGenerationErrorMessage(err: unknown): string {
  const fallback = "Image generation failed.";
  if (!(err instanceof Error)) return fallback;
  const match = err.message.match(/\{.*\}/s);
  if (!match) return err.message || fallback;
  try {
    const parsed = JSON.parse(match[0]);
    const message = parsed?.error?.message ?? parsed?.message;
    return typeof message === "string" && message.trim() ? message : fallback;
  } catch {
    return err.message || fallback;
  }
}

export type RunCaseOutcome = {
  caseId: string;
  status: CaseStatus;
  error?: string;
};

async function runNameCase(args: {
  caseId: string;
  accountId: string;
  userId: string;
  config: NameCaseConfig;
}): Promise<RunCaseOutcome> {
  const { caseId, accountId, userId, config } = args;
  const promptMode = config.promptMode ?? await getNamePromptMode(accountId);
  const styleOverride = config.pendantFinish === "plain"
    ? null
    : await loadStyleOverride(accountId, config.styleId);
  const { styleOverride: effectiveStyleOverride, promptOverrideId } = await buildCaseStyleOverride({
    accountId,
    styleId: config.styleId,
    promptMode,
    caseId,
    baseOverride: styleOverride
  });

  const inspection = inspectStyle(
    {
      userId,
      styleId: config.styleId,
      text: config.text,
      pendantFinish: config.pendantFinish,
      twoTone: config.twoTone,
      primaryMetal: config.primaryMetal,
      secondaryMetal: config.secondaryMetal,
      emblem: config.emblem,
      plainColor: config.plainColor,
      plainMetal: config.plainMetal,
      plainKarat: config.plainKarat,
      plainChain: config.plainChain
    },
    { promptMode, styleOverride: effectiveStyleOverride }
  );

  const variants = buildVariants(
    {
      userId,
      styleId: config.styleId,
      text: config.text,
      pendantFinish: config.pendantFinish,
      twoTone: config.twoTone,
      primaryMetal: config.primaryMetal,
      secondaryMetal: config.secondaryMetal,
      emblem: config.emblem,
      plainColor: config.plainColor,
      plainMetal: config.plainMetal,
      plainKarat: config.plainKarat,
      plainChain: config.plainChain
    },
    { promptMode, styleOverride: effectiveStyleOverride }
  );

  const isPlain = config.pendantFinish === "plain";
  const request = await prisma.request.create({
    data: {
      accountId,
      userId,
      productType: "name",
      pendantFinish: config.pendantFinish,
      styleId: config.styleId,
      text: config.text,
      twoTone: isPlain ? false : Boolean(config.twoTone),
      primaryMetal: isPlain ? (config.plainColor ?? "gold") : (config.primaryMetal ?? "yellow_gold"),
      secondaryMetal: isPlain ? null : (config.secondaryMetal ?? null),
      emblem: isPlain ? "none" : (config.emblem ?? "none"),
      diamondQuality: config.diamondQuality ?? null
    }
  });

  const renderedConfig = {
    promptMode,
    styleId: inspection.styleId,
    styleLabel: inspection.styleLabel,
    templateKey: inspection.templateKey,
    defaults: inspection.defaults,
    variantMatrix: inspection.variantMatrix,
    promptOverrideId,
    promptSource: promptOverrideId ? "temporary_override" : "system",
    modelSelection: config.modelSelection ?? null,
    variants: inspection.variants.map(v => ({
      variant: v.variant,
      prompt: v.prompt,
      attachments: v.attachments
    }))
  };

  await prisma.generationLabCase.update({
    where: { id: caseId },
    data: {
      requestId: request.id,
      sourceTemplatePath: inspection.templatePath,
      sourceStylePath: inspection.styleYmlPath,
      renderedConfigJson: JSON.stringify(renderedConfig)
    }
  });

  const attemptRows = await Promise.all(variants.map((variant) => {
    const startedAt = new Date();
    return prisma.result.create({
      data: {
        accountId,
        requestId: request.id,
        variant: variant.variant,
        prompt: variant.prompt,
        status: "pending",
        startedAt
      }
    });
  }));

  // Pre-create unreviewed stubs so the UI can render review controls immediately.
  await Promise.all(attemptRows.map((row, index) => prisma.generationLabResultReview.create({
    data: {
      caseId,
      resultId: row.id,
      accountId,
      variant: variants[index].variant,
      status: "unreviewed"
    }
  }).catch(() => null)));

  let succeeded = 0;
  let failed = 0;

  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];
    const attempt = attemptRows[index];
    const startedMs = attempt.startedAt?.getTime() ?? Date.now();
    try {
      const { imageUrl, modelId } = await generateImage({
        prompt: variant.prompt,
        attachments: variant.attachments,
        requestId: request.id,
        variant: variant.variant,
        modelIdOverride: selectedModelForVariant(config, variant.variant),
        onPreparedAttachments: async (attachments) => {
          await prisma.result.update({
            where: { id: attempt.id },
            data: { attachmentPathsJson: JSON.stringify(attachments) }
          });
        }
      });
      const completedAt = new Date();
      await prisma.result.update({
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
      succeeded += 1;
    } catch (err) {
      console.error(`[generation-lab case ${caseId} variant ${variant.variant}] failed:`, err);
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
      failed += 1;
    }
  }

  const status: CaseStatus = failed === 0 ? "succeeded" : succeeded === 0 ? "failed" : "partial";
  return { caseId, status };
}

async function runBraceletCase(args: {
  caseId: string;
  accountId: string;
  userId: string;
  config: BraceletCaseConfig;
}): Promise<RunCaseOutcome> {
  const { caseId, accountId, userId, config } = args;
  const isWomens = config.productLine === "womens";
  const text = config.text.split("\n").map(line => line.trim()).filter(Boolean).join(isWomens ? " " : "\n");
  const prompt = isWomens
    ? buildWomensBraceletPrompt(text, BRACELET_COLOR_LABELS[config.colorCombo])
    : buildIcedoutBraceletPrompt(text, BRACELET_COLOR_LABELS[config.colorCombo]);
  const attachmentPath = path.join(process.cwd(), BRACELET_STYLES[config.styleId]);

  const request = await prisma.request.create({
    data: {
      accountId,
      userId,
      productType: "bracelet",
      pendantFinish: isWomens ? "womens" : "icedout",
      styleId: `bracelet_${config.styleId}`,
      text,
      twoTone: false,
      primaryMetal: config.colorCombo === "white" ? "white_gold" : config.colorCombo === "yellow_gold" ? "yellow_gold" : "rose_gold",
      secondaryMetal: null,
      emblem: "none",
      metalType: config.metalType,
      stoneType: isWomens ? null : config.stoneType,
      diamondQuality: isWomens ? null : config.diamondQuality
    }
  });

  const renderedConfig = {
    family: "bracelet",
    productLine: config.productLine,
    styleId: config.styleId,
    attachmentPath,
    prompt
    ,
    modelSelection: config.modelSelection ?? null
  };

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

  await prisma.generationLabResultReview.create({
    data: {
      caseId,
      resultId: attempt.id,
      accountId,
      variant: 1,
      status: "unreviewed"
    }
  }).catch(() => null);

  await prisma.generationLabCase.update({
    where: { id: caseId },
    data: {
      requestId: request.id,
      sourceStylePath: BRACELET_STYLES[config.styleId],
      renderedConfigJson: JSON.stringify(renderedConfig)
    }
  });

  const startedMs = attempt.startedAt?.getTime() ?? Date.now();
  try {
    const { imageUrl, modelId } = await generateImage({
      prompt,
      attachments: [attachmentPath],
      requestId: request.id,
      variant: 1,
      modelIdOverride: selectedModelForVariant(config, 1),
      onPreparedAttachments: async (attachments) => {
        await prisma.result.update({
          where: { id: attempt.id },
          data: { attachmentPathsJson: JSON.stringify(attachments) }
        });
      }
    });
    const completedAt = new Date();
    await prisma.result.update({
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
    return { caseId, status: "succeeded" };
  } catch (err) {
    console.error(`[generation-lab bracelet case ${caseId}] failed:`, err);
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
    return { caseId, status: "failed" };
  }
}

/**
 * Execute one case. Persists a normal Request + Result rows so the output is
 * quote-eligible exactly like a customer generation. Continues on failure and
 * marks the case status accordingly.
 */
export async function runLabCase(args: {
  caseId: string;
  accountId: string;
  userId: string;
}): Promise<RunCaseOutcome> {
  const { caseId, accountId, userId } = args;
  const labCase = await prisma.generationLabCase.findUnique({ where: { id: caseId } });
  if (!labCase) return { caseId, status: "skipped", error: "Case not found" };

  let config: LabCaseConfig;
  try {
    config = parseCaseConfig(labCase.configJson);
  } catch (err) {
    await prisma.generationLabCase.update({
      where: { id: caseId },
      data: { status: "failed", error: "Invalid case config.", completedAt: new Date() }
    });
    return { caseId, status: "failed", error: "Invalid case config" };
  }

  if (!familyIsWired(config.family)) {
    await prisma.generationLabCase.update({
      where: { id: caseId },
      data: {
        status: "skipped",
        error: `${config.family} generation is not wired in the lab yet.`,
        completedAt: new Date()
      }
    });
    return { caseId, status: "skipped", error: "Family not wired" };
  }

  await prisma.generationLabCase.update({
    where: { id: caseId },
    data: { status: "running", startedAt: new Date(), error: null }
  });

  try {
    const outcome = config.family === "name"
      ? await runNameCase({ caseId, accountId, userId, config })
      : config.family === "bracelet"
        ? await runBraceletCase({ caseId, accountId, userId, config })
        : { caseId, status: "skipped" as CaseStatus, error: "Family not wired" };

    await prisma.generationLabCase.update({
      where: { id: caseId },
      data: { status: outcome.status, error: outcome.error, completedAt: new Date() }
    });
    return outcome;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Case execution failed.";
    await prisma.generationLabCase.update({
      where: { id: caseId },
      data: { status: "failed", error: message, completedAt: new Date() }
    });
    return { caseId, status: "failed", error: message };
  }
}

/**
 * Execute all cases in a run sequentially. Continues when a case fails and
 * marks each case independently. The run status reflects whether every case
 * finished (completed) or the run itself errored (failed).
 */
export async function runLabRun(args: { runId: string; accountId: string; userId: string }): Promise<void> {
  const { runId, accountId, userId } = args;
  const run = await prisma.generationLabRun.findUnique({
    where: { id: runId },
    include: { Cases: { orderBy: { sortOrder: "asc" } } }
  });
  if (!run || run.accountId !== accountId) return;

  await prisma.generationLabRun.update({
    where: { id: runId },
    data: { status: "running", startedAt: new Date() }
  });

  try {
    for (const labCase of run.Cases) {
      // Re-fetch in case config was edited after the run started.
      await runLabCase({ caseId: labCase.id, accountId, userId });
    }
    await prisma.generationLabRun.update({
      where: { id: runId },
      data: { status: "completed", completedAt: new Date() }
    });
  } catch (err) {
    console.error(`[generation-lab run ${runId}] failed:`, err);
    await prisma.generationLabRun.update({
      where: { id: runId },
      data: { status: "failed", completedAt: new Date() }
    });
  }
}

export function expectedRunGenerations(cases: LabCaseConfig[]): number {
  return cases.reduce((sum, cfg) => sum + expectedGenerationsForFamily(cfg.family), 0);
}

async function nextRunLabel(accountId: string, baseLabel: string) {
  const escaped = baseLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const siblings = await prisma.generationLabRun.findMany({
    where: { accountId, label: { startsWith: baseLabel } },
    select: { label: true }
  });
  const used = new Set(siblings.map(run => run.label));
  for (let index = 1; index < 1000; index += 1) {
    const candidate = `${baseLabel}-${index}`;
    if (!used.has(candidate) && new RegExp(`^${escaped}-${index}$`).test(candidate)) return candidate;
  }
  return `${baseLabel}-${Date.now()}`;
}

export async function duplicateRunForRerun(args: { runId: string; accountId: string; userId: string }) {
  const source = await prisma.generationLabRun.findUnique({
    where: { id: args.runId },
    include: {
      Cases: {
        orderBy: { sortOrder: "asc" },
        include: { PromptOverrides: { where: { status: "draft" }, orderBy: { updatedAt: "desc" } } }
      }
    }
  });
  if (!source || source.accountId !== args.accountId) throw new Error("Run not found.");

  const label = await nextRunLabel(args.accountId, source.label.replace(/-\d+$/, ""));
  return prisma.$transaction(async (tx) => {
    const clonedRun = await tx.generationLabRun.create({
      data: {
        accountId: args.accountId,
        userId: args.userId,
        label,
        notes: source.notes,
        status: "draft"
      }
    });

    for (const sourceCase of source.Cases) {
      const clonedCase = await tx.generationLabCase.create({
        data: {
          runId: clonedRun.id,
          accountId: args.accountId,
          sortOrder: sourceCase.sortOrder,
          family: sourceCase.family,
          configJson: sourceCase.configJson
        }
      });
      let selectedPromptOverrideId: string | null = null;
      for (const draft of sourceCase.PromptOverrides) {
        const clonedDraft = await tx.generationLabPromptOverride.create({
          data: {
            runId: clonedRun.id,
            caseId: clonedCase.id,
            accountId: args.accountId,
            styleId: draft.styleId,
            promptMode: draft.promptMode,
            sourcePath: draft.sourcePath,
            name: draft.name,
            originalText: draft.originalText,
            draftText: draft.draftText,
            status: "draft"
          }
        });
        if (draft.id === sourceCase.selectedPromptOverrideId) {
          selectedPromptOverrideId = clonedDraft.id;
        }
      }
      if (selectedPromptOverrideId) {
        await tx.generationLabCase.update({
          where: { id: clonedCase.id },
          data: { selectedPromptOverrideId }
        });
      }
    }

    return clonedRun;
  });
}
