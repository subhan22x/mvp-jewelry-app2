import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import {
  createOrUpdatePromptOverride,
  discardPromptOverride,
  getDraftPromptOverride,
  resolvePromptSource,
  selectPromptOverride
} from "@/src/lib/generation-lab/prompt-overrides";
import { parseCaseConfig } from "@/src/lib/generation-lab/types";

export const dynamic = "force-dynamic";

const Body = z.object({
  id: z.string().optional().nullable(),
  name: z.string().min(1).max(80).default("Untitled draft"),
  draftText: z.string().min(1),
  select: z.boolean().optional()
});
const PatchBody = z.object({
  selectedPromptOverrideId: z.string().nullable()
});

async function loadCase(caseId: string, accountId: string) {
  const labCase = await prisma.generationLabCase.findUnique({
    where: { id: caseId },
    include: { run: true }
  });
  if (!labCase || labCase.accountId !== accountId) return null;
  return labCase;
}

export async function GET(_: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { caseId } = await params;
  const labCase = await loadCase(caseId, owner.accountId);
  if (!labCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  try {
    const config = parseCaseConfig(labCase.configJson);
    const source = await resolvePromptSource({
      runId: labCase.runId,
      caseId: labCase.id,
      accountId: owner.accountId,
      userId: owner.userId,
      config
    });
    const drafts = await prisma.generationLabPromptOverride.findMany({
      where: {
        caseId: labCase.id,
        accountId: owner.accountId,
        status: { in: ["draft", "applied"] }
      },
      orderBy: { updatedAt: "desc" }
    });
    const draft = drafts.find(item => item.id === labCase.selectedPromptOverrideId)
      ?? await getDraftPromptOverride({ caseId: labCase.id, accountId: owner.accountId });

    return NextResponse.json({
      id: draft?.id ?? null,
      runId: labCase.runId,
      caseId: labCase.id,
      styleId: source.styleId,
      promptMode: source.promptMode,
      sourcePath: source.sourcePath,
      originalText: draft?.originalText ?? source.originalText,
      draftText: draft?.draftText ?? source.originalText,
      status: draft?.status ?? "system",
      appliedAt: draft?.appliedAt ?? null,
      updatedAt: draft?.updatedAt ?? null,
      selectedPromptOverrideId: labCase.selectedPromptOverrideId,
      drafts: drafts.map(item => ({
        id: item.id,
        name: item.name,
        status: item.status,
        styleId: item.styleId,
        promptMode: item.promptMode,
        sourcePath: item.sourcePath,
        originalText: item.originalText,
        draftText: item.draftText,
        appliedAt: item.appliedAt,
        updatedAt: item.updatedAt
      }))
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "bad_request" }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { caseId } = await params;
  const labCase = await loadCase(caseId, owner.accountId);
  if (!labCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  if (labCase.run.status === "running") {
    return NextResponse.json({ error: "Cannot edit a prompt while the run is running." }, { status: 409 });
  }

  try {
    const body = Body.parse(await req.json());
    const override = await createOrUpdatePromptOverride({
      runId: labCase.runId,
      caseId: labCase.id,
      accountId: owner.accountId,
      userId: owner.userId,
      id: body.id,
      name: body.name,
      draftText: body.draftText,
      select: body.select ?? true
    });

    return NextResponse.json({
      id: override.id,
      status: override.status,
      name: override.name,
      sourcePath: override.sourcePath,
      originalText: override.originalText,
      draftText: override.draftText,
      updatedAt: override.updatedAt
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "bad_request" }, { status: 400 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { caseId } = await params;
  const labCase = await loadCase(caseId, owner.accountId);
  if (!labCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  if (labCase.run.status === "running") {
    return NextResponse.json({ error: "Cannot select a prompt while the run is running." }, { status: 409 });
  }

  try {
    const body = PatchBody.parse(await req.json());
    const updated = await selectPromptOverride({
      id: body.selectedPromptOverrideId,
      caseId: labCase.id,
      accountId: owner.accountId
    });
    return NextResponse.json({ id: updated.id, selectedPromptOverrideId: updated.selectedPromptOverrideId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "bad_request" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { caseId } = await params;
  const labCase = await loadCase(caseId, owner.accountId);
  if (!labCase) return NextResponse.json({ error: "Case not found." }, { status: 404 });
  if (labCase.run.status === "running") {
    return NextResponse.json({ error: "Cannot discard a prompt while the run is running." }, { status: 409 });
  }

  const url = new URL(_.url);
  const draftId = url.searchParams.get("id");
  if (draftId === "system") {
    await selectPromptOverride({ id: null, caseId: labCase.id, accountId: owner.accountId });
    return NextResponse.json({ ok: true });
  }
  const draft = draftId
    ? await prisma.generationLabPromptOverride.findUnique({ where: { id: draftId } })
    : await getDraftPromptOverride({ caseId: labCase.id, accountId: owner.accountId });
  if (!draft) return NextResponse.json({ ok: true });
  if (draft.accountId !== owner.accountId || draft.caseId !== labCase.id) {
    return NextResponse.json({ error: "Prompt draft not found." }, { status: 404 });
  }

  try {
    await discardPromptOverride({ id: draft.id, accountId: owner.accountId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "bad_request" }, { status: 400 });
  }
}
