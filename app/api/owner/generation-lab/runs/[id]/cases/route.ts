import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { CaseConfig, MAX_GENERATION_CALLS_PER_RUN, expectedGenerationsForFamily } from "@/src/lib/generation-lab/types";

export const dynamic = "force-dynamic";

const Body = z.object({
  cases: z.array(CaseConfig).min(1)
}).superRefine((body, ctx) => {
  const total = body.cases.reduce((sum, cfg) => sum + expectedGenerationsForFamily(cfg.family), 0);
  if (total > MAX_GENERATION_CALLS_PER_RUN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["cases"],
      message: `Run would generate ${total} images. Max ${MAX_GENERATION_CALLS_PER_RUN} per run.`
    });
  }
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const run = await prisma.generationLabRun.findUnique({
    where: { id },
    include: { Cases: { orderBy: { sortOrder: "asc" } } }
  });
  if (!run || run.accountId !== owner.accountId) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }
  if (run.status === "running") {
    return NextResponse.json({ error: "Cannot edit a running run." }, { status: 409 });
  }

  try {
    const body = Body.parse(await req.json());

    // Replace cases entirely. Existing cases (and their reviews) are deleted.
    await prisma.generationLabCase.deleteMany({ where: { runId: run.id } });

    const created = await prisma.$transaction(
      body.cases.map((config, index) => prisma.generationLabCase.create({
        data: {
          runId: run.id,
          accountId: owner.accountId,
          sortOrder: index,
          family: config.family,
          configJson: JSON.stringify(config)
        }
      }))
    );

    return NextResponse.json({
      runId: run.id,
      cases: created.map(labCase => ({ id: labCase.id, family: labCase.family, sortOrder: labCase.sortOrder }))
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "bad_request" }, { status: 400 });
  }
}
