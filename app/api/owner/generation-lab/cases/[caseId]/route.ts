import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { PatchCaseBody } from "@/src/lib/generation-lab/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
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
    return NextResponse.json({ error: "Cannot edit a case on a running run." }, { status: 409 });
  }

  try {
    const body = PatchCaseBody.parse(await req.json());
    const data: { configJson?: string; sortOrder?: number; family?: string } = {};
    if (body.config) {
      data.configJson = JSON.stringify(body.config);
      data.family = body.config.family;
    }
    if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;

    const updated = await prisma.generationLabCase.update({ where: { id: caseId }, data });
    return NextResponse.json({ id: updated.id, status: updated.status, family: updated.family });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "bad_request" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ caseId: string }> }) {
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
    return NextResponse.json({ error: "Cannot delete a case on a running run." }, { status: 409 });
  }

  await prisma.generationLabCase.delete({ where: { id: caseId } });
  return NextResponse.json({ ok: true });
}
