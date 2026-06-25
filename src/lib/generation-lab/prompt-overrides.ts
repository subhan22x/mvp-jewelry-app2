import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db/client";
import { inspectStyle } from "@/src/lib/styles/inspect";
import { getNamePromptMode } from "@/src/lib/prompt-mode";
import { loadStyleOverride, type StylePromptOverride } from "@/src/lib/styles/style-overrides";
import { parseCaseConfig, type LabCaseConfig, type NameCaseConfig } from "./types";

export const PROMPT_OVERRIDE_STATUSES = ["draft", "applied", "discarded"] as const;
const MAX_ACTIVE_PROMPT_DRAFTS_PER_CASE = 10;

export type PromptOverrideInput = {
  runId: string;
  caseId: string;
  accountId: string;
  userId: string;
};

function assertAllowedSourcePath(sourcePath: string) {
  const stylesDir = path.join(process.cwd(), "src", "lib", "styles");
  const relative = path.relative(stylesDir, sourcePath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Prompt source path is outside the style system.");
  }
}

function mergeStyleOverride(base: StylePromptOverride | null, promptMode: string, draftText: string): StylePromptOverride {
  return promptMode === "natural_language"
    ? { ...(base ?? {}), naturalLanguageTemplateRaw: draftText }
    : { ...(base ?? {}), templateRaw: draftText };
}

async function resolveNamePromptSource(args: PromptOverrideInput & { config: NameCaseConfig }) {
  const { accountId, userId, config } = args;
  const promptMode = config.promptMode ?? await getNamePromptMode(accountId);
  const accountOverride = config.pendantFinish === "plain"
    ? null
    : await loadStyleOverride(accountId, config.styleId);
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
    { promptMode, styleOverride: accountOverride ?? undefined }
  );

  assertAllowedSourcePath(inspection.templatePath);
  const originalText = await fs.readFile(inspection.templatePath, "utf8");

  return {
    styleId: config.styleId,
    promptMode,
    sourcePath: inspection.templatePath,
    originalText
  };
}

export async function resolvePromptSource(args: PromptOverrideInput & { config: LabCaseConfig }) {
  if (args.config.family !== "name") {
    throw new Error("Temporary prompt overrides are currently supported for name pendant cases only.");
  }
  return resolveNamePromptSource({ ...args, config: args.config });
}

export async function createOrUpdatePromptOverride(args: PromptOverrideInput & { id?: string | null; name: string; draftText: string; select?: boolean }) {
  const labCase = await prisma.generationLabCase.findUnique({
    where: { id: args.caseId },
    include: { run: true }
  });
  if (!labCase || labCase.runId !== args.runId || labCase.accountId !== args.accountId) {
    throw new Error("Case not found.");
  }

  const config = parseCaseConfig(labCase.configJson);
  const source = await resolvePromptSource({ ...args, config });
  const draftText = args.draftText;

  const name = args.name.trim().slice(0, 80) || "Untitled draft";
  const existing = args.id
    ? await prisma.generationLabPromptOverride.findUnique({ where: { id: args.id } })
    : null;

  if (existing) {
    if (existing.accountId !== args.accountId || existing.caseId !== args.caseId) {
      throw new Error("Prompt draft not found.");
    }
    const updated = await prisma.generationLabPromptOverride.update({
      where: { id: existing.id },
      data: {
        styleId: source.styleId,
        promptMode: source.promptMode,
        sourcePath: source.sourcePath,
        name,
        draftText
      }
    });
    if (args.select) {
      await prisma.generationLabCase.update({
        where: { id: args.caseId },
        data: { selectedPromptOverrideId: updated.id }
      });
    }
    return updated;
  }

  const activeCount = await prisma.generationLabPromptOverride.count({
    where: { caseId: args.caseId, accountId: args.accountId, status: "draft" }
  });
  if (activeCount >= MAX_ACTIVE_PROMPT_DRAFTS_PER_CASE) {
    throw new Error(`This case already has ${MAX_ACTIVE_PROMPT_DRAFTS_PER_CASE} active prompt drafts. Archive or discard one before creating another.`);
  }

  const created = await prisma.generationLabPromptOverride.create({
    data: {
      runId: args.runId,
      caseId: args.caseId,
      accountId: args.accountId,
      styleId: source.styleId,
      promptMode: source.promptMode,
      sourcePath: source.sourcePath,
      name,
      originalText: source.originalText,
      draftText,
      status: "draft"
    }
  });
  if (args.select ?? true) {
    await prisma.generationLabCase.update({
      where: { id: args.caseId },
      data: { selectedPromptOverrideId: created.id }
    });
  }
  return created;
}

export async function getDraftPromptOverride(args: { caseId: string; accountId: string }) {
  const labCase = await prisma.generationLabCase.findUnique({ where: { id: args.caseId } });
  if (labCase?.selectedPromptOverrideId) {
    const selected = await prisma.generationLabPromptOverride.findUnique({
      where: { id: labCase.selectedPromptOverrideId }
    });
    if (selected?.accountId === args.accountId && selected.caseId === args.caseId && selected.status === "draft") {
      return selected;
    }
  }
  return prisma.generationLabPromptOverride.findFirst({
    where: {
      caseId: args.caseId,
      accountId: args.accountId,
      status: "draft"
    },
    orderBy: { updatedAt: "desc" }
  });
}

export async function buildCaseStyleOverride(args: {
  accountId: string;
  styleId: string;
  promptMode: string;
  caseId: string;
  baseOverride: StylePromptOverride | null;
}) {
  const draft = await getDraftPromptOverride({ caseId: args.caseId, accountId: args.accountId });
  if (!draft || draft.styleId !== args.styleId || draft.promptMode !== args.promptMode) {
    return { styleOverride: args.baseOverride ?? undefined, promptOverrideId: null as string | null };
  }

  return {
    styleOverride: mergeStyleOverride(args.baseOverride, args.promptMode, draft.draftText),
    promptOverrideId: draft.id
  };
}

export async function discardPromptOverride(args: { id: string; accountId: string }) {
  const override = await prisma.generationLabPromptOverride.findUnique({ where: { id: args.id } });
  if (!override || override.accountId !== args.accountId) {
    throw new Error("Prompt override not found.");
  }
  const updated = await prisma.generationLabPromptOverride.update({
    where: { id: args.id },
    data: { status: "discarded" }
  });
  await prisma.generationLabCase.updateMany({
    where: { selectedPromptOverrideId: args.id, accountId: args.accountId },
    data: { selectedPromptOverrideId: null }
  });
  return updated;
}

export async function selectPromptOverride(args: { id: string | null; caseId: string; accountId: string }) {
  if (args.id) {
    const override = await prisma.generationLabPromptOverride.findUnique({ where: { id: args.id } });
    if (!override || override.accountId !== args.accountId || override.caseId !== args.caseId || override.status !== "draft") {
      throw new Error("Prompt draft not found.");
    }
  }
  return prisma.generationLabCase.update({
    where: { id: args.caseId },
    data: { selectedPromptOverrideId: args.id }
  });
}

export async function applyPromptOverride(args: { id: string; accountId: string }) {
  const override = await prisma.generationLabPromptOverride.findUnique({ where: { id: args.id } });
  if (!override || override.accountId !== args.accountId) {
    throw new Error("Prompt override not found.");
  }
  if (override.status !== "draft") {
    throw new Error("Only draft prompt overrides can be applied.");
  }

  assertAllowedSourcePath(override.sourcePath);
  const currentText = await fs.readFile(override.sourcePath, "utf8");
  if (currentText !== override.originalText) {
    const err = new Error("The source prompt file changed since this draft was created. Review the diff and create a fresh draft before applying.");
    err.name = "PromptOverrideConflict";
    throw err;
  }

  await fs.writeFile(override.sourcePath, override.draftText, "utf8");
  return prisma.generationLabPromptOverride.update({
    where: { id: args.id },
    data: { status: "applied", appliedAt: new Date() }
  });
}
