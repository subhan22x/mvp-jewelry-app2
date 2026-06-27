import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { applyPromptOverride, getDraftPromptOverride } from "@/src/lib/generation-lab/prompt-overrides";

export const dynamic = "force-dynamic";
const Body = z.object({ id: z.string().optional() }).optional();

export async function POST(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { caseId } = await params;
  const labCase = await prisma.generationLabCase.findUnique({
    where: { id: caseId },
    include: { run: true }
  });
  if (!labCase || labCase.accountId !== owner.accountId) {
    return NextResponse.json({ error: "Case not found." }, { status: 404 });
  }
  if (labCase.run.status === "running") {
    return NextResponse.json({ error: "Cannot apply a prompt while the run is running." }, { status: 409 });
  }

  const body = Body.parse(await req.json().catch(() => undefined));
  const draft = body?.id
    ? await prisma.generationLabPromptOverride.findUnique({ where: { id: body.id } })
    : await getDraftPromptOverride({ caseId: labCase.id, accountId: owner.accountId });
  if (!draft) return NextResponse.json({ error: "No draft prompt override to apply." }, { status: 404 });
  if (draft.accountId !== owner.accountId || draft.caseId !== labCase.id) {
    return NextResponse.json({ error: "Prompt draft not found." }, { status: 404 });
  }

  try {
    const applied = await applyPromptOverride({ id: draft.id, accountId: owner.accountId });
    return NextResponse.json({
      id: applied.id,
      status: applied.status,
      sourcePath: applied.sourcePath,
      appliedAt: applied.appliedAt
    });
  } catch (err) {
    const status = err instanceof Error && err.name === "PromptOverrideConflict" ? 409 : 400;
    return NextResponse.json({ error: err instanceof Error ? err.message : "bad_request" }, { status });
  }
}
