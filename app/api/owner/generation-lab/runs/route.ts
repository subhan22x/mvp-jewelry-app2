import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { CreateRunBody } from "@/src/lib/generation-lab/types";
import { expectedRunGenerations } from "@/src/lib/generation-lab/runner";

export const dynamic = "force-dynamic";

export async function GET() {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const runs = await prisma.generationLabRun.findMany({
    where: { accountId: owner.accountId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      Cases: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, family: true, status: true, requestId: true }
      }
    }
  });

  return NextResponse.json({
    runs: runs.map(run => ({
      id: run.id,
      label: run.label,
      notes: run.notes,
      status: run.status,
      createdAt: run.createdAt,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      caseCount: run.Cases.length,
      cases: run.Cases
    }))
  });
}

export async function POST(req: Request) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  try {
    const body = CreateRunBody.parse(await req.json());
    const expectedGens = expectedRunGenerations(body.cases);

    const run = await prisma.generationLabRun.create({
      data: {
        accountId: owner.accountId,
        userId: owner.userId,
        label: body.label,
        notes: body.notes,
        status: "draft",
        Cases: {
          create: body.cases.map((config, index) => ({
            accountId: owner.accountId,
            sortOrder: index,
            family: config.family,
            configJson: JSON.stringify(config)
          }))
        }
      },
      include: { Cases: { orderBy: { sortOrder: "asc" } } }
    });

    return NextResponse.json({
      id: run.id,
      label: run.label,
      status: run.status,
      expectedGenerations: expectedGens,
      caseCount: run.Cases.length,
      cases: run.Cases
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "bad_request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
