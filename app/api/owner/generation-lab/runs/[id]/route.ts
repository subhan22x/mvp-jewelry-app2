import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const run = await prisma.generationLabRun.findUnique({
    where: { id },
    include: {
      Cases: {
        orderBy: { sortOrder: "asc" },
        include: {
          request: {
            include: {
              Results: { orderBy: { variant: "asc" } }
            }
          },
          Reviews: { include: { result: true } },
          PromptOverrides: {
            where: { status: { in: ["draft", "applied"] } },
            orderBy: { updatedAt: "desc" },
            take: 10
          }
        }
      }
    }
  });

  if (!run || run.accountId !== owner.accountId) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: run.id,
    label: run.label,
    notes: run.notes,
    status: run.status,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    cases: run.Cases.map(labCase => ({
      id: labCase.id,
      sortOrder: labCase.sortOrder,
      family: labCase.family,
      configJson: labCase.configJson,
      status: labCase.status,
      error: labCase.error,
      requestId: labCase.requestId,
      sourceStylePath: labCase.sourceStylePath,
      sourceTemplatePath: labCase.sourceTemplatePath,
      renderedConfigJson: labCase.renderedConfigJson,
      selectedPromptOverrideId: labCase.selectedPromptOverrideId,
      startedAt: labCase.startedAt,
      completedAt: labCase.completedAt,
      promptOverrides: labCase.PromptOverrides.map(override => ({
        id: override.id,
        name: override.name,
        status: override.status,
        styleId: override.styleId,
        promptMode: override.promptMode,
        sourcePath: override.sourcePath,
        originalText: override.originalText,
        draftText: override.draftText,
        appliedAt: override.appliedAt,
        updatedAt: override.updatedAt
      })),
      promptOverride: labCase.PromptOverrides.find(override => override.id === labCase.selectedPromptOverrideId) ?? labCase.PromptOverrides[0] ?? null,
      results: labCase.request?.Results ?? [],
      reviews: labCase.Reviews
    }))
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const run = await prisma.generationLabRun.findUnique({ where: { id } });
  if (!run || run.accountId !== owner.accountId) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }
  if (run.status === "running") {
    return NextResponse.json({ error: "Cannot edit a running run." }, { status: 409 });
  }

  try {
    const body = await req.json();
    const data: { label?: string; notes?: string | null } = {};
    if (typeof body.label === "string" && body.label.trim()) data.label = body.label.trim().slice(0, 120);
    if (body.notes !== undefined) data.notes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : null;

    const updated = await prisma.generationLabRun.update({ where: { id }, data });
    return NextResponse.json({ id: updated.id, label: updated.label, notes: updated.notes, status: updated.status });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "bad_request" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const run = await prisma.generationLabRun.findUnique({ where: { id } });
  if (!run || run.accountId !== owner.accountId) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }
  if (run.status === "running") {
    return NextResponse.json({ error: "Cannot delete a running run." }, { status: 409 });
  }

  await prisma.generationLabRun.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
