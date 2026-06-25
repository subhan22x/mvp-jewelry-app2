import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { buildRunCsv } from "@/src/lib/generation-lab/csv";
import { parseCaseConfigOrNull } from "@/src/lib/generation-lab/types";

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
          request: { include: { Results: { orderBy: { variant: "asc" } } } },
          Reviews: true
        }
      }
    }
  });
  if (!run || run.accountId !== owner.accountId) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  const rows: Parameters<typeof buildRunCsv>[0] = [];
  for (const labCase of run.Cases) {
    const config = parseCaseConfigOrNull(labCase.configJson);
    const results = labCase.request?.Results ?? [];
    if (results.length === 0) {
      // Emit a row with empty result fields so pending/failed cases appear in the export.
      results.push({
        id: "",
        variant: 0,
        status: labCase.status,
        imageUrl: null,
        prompt: "",
        modelId: null,
        error: labCase.error,
        durationMs: null,
        attachmentPathsJson: null,
        accountId: labCase.accountId,
        requestId: labCase.requestId ?? "",
        completedAt: labCase.completedAt,
        createdAt: labCase.createdAt,
        startedAt: labCase.startedAt
      } as never);
    }
    for (const result of results) {
      const review = labCase.Reviews.find(r => r.resultId === result.id) ?? null;
      rows.push({
        case: labCase,
        config,
        result: {
          id: result.id,
          variant: result.variant,
          status: result.status,
          imageUrl: result.imageUrl,
          prompt: result.prompt,
          modelId: result.modelId,
          error: result.error,
          durationMs: result.durationMs,
          attachmentPathsJson: result.attachmentPathsJson
        },
        review: review ? {
          status: review.status,
          failureTagsJson: review.failureTagsJson,
          notes: review.notes
        } : null
      });
    }
  }

  const csv = buildRunCsv(rows, run.label);
  const filename = `generation-lab-${run.id}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
