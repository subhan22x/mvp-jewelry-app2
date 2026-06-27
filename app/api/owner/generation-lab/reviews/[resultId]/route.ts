import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { PatchReviewBody } from "@/src/lib/generation-lab/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ resultId: string }> }) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { resultId } = await params;
  const review = await prisma.generationLabResultReview.findUnique({
    where: { resultId },
    include: { case: { include: { run: true } } }
  });
  if (!review || review.accountId !== owner.accountId) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  try {
    const body = PatchReviewBody.parse(await req.json());
    const data: { status?: string; failureTagsJson?: string; notes?: string | null } = {};
    if (body.status) data.status = body.status;
    if (body.failureTags) data.failureTagsJson = JSON.stringify(body.failureTags);
    if (body.notes !== undefined) data.notes = typeof body.notes === "string" ? body.notes.slice(0, 2000) : null;

    const updated = await prisma.generationLabResultReview.update({
      where: { resultId },
      data
    });
    return NextResponse.json({
      id: updated.id,
      resultId: updated.resultId,
      status: updated.status,
      failureTagsJson: updated.failureTagsJson,
      notes: updated.notes
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "bad_request" }, { status: 400 });
  }
}
