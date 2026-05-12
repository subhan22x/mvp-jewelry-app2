import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';

const EXPECTED_GENERATION_COUNT = 2;

const toSeconds = (durationMs: number | null) =>
  typeof durationMs === 'number' ? Number((durationMs / 1000).toFixed(2)) : null;

export async function GET(_: Request, { params }: { params: { id: string }}) {
  const reqRow = await prisma.request.findUnique({
    where: { id: params.id },
    include: { Results: { orderBy: { variant: 'asc' } } }
  });
  if (!reqRow) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const productType = reqRow.productType ?? 'name';
  const expectedGenerationCount = productType === 'picture' ? 1 : EXPECTED_GENERATION_COUNT;
  const attempts = reqRow.Results.map(r => ({
    variant: r.variant,
    status: r.status,
    imageUrl: r.imageUrl,
    modelId: r.modelId,
    error: r.error,
    durationMs: r.durationMs,
    durationSeconds: toSeconds(r.durationMs)
  }));
  const results = attempts
    .filter(r => r.status === 'succeeded' && r.imageUrl)
    .map(r => ({ variant: r.variant, imageUrl: r.imageUrl, modelId: r.modelId, durationSeconds: r.durationSeconds }));
  const pendingCount = attempts.filter(r => r.status === 'pending').length;
  const failedCount = attempts.filter(r => r.status === 'failed').length;
  const succeededCount = attempts.filter(r => r.status === 'succeeded').length;
  const done = attempts.length >= expectedGenerationCount && pendingCount === 0;
  return NextResponse.json({
    id: reqRow.id,
    productType,
    styleId: reqRow.styleId,
    text: reqRow.text,
    uploadFileName: reqRow.uploadFileName,
    metals: { twoTone: reqRow.twoTone, primary: reqRow.primaryMetal, secondary: reqRow.secondaryMetal },
    emblem: reqRow.emblem,
    size: reqRow.size,
    metalType: reqRow.metalType,
    stoneType: reqRow.stoneType,
    results,
    attempts,
    generation: {
      total: expectedGenerationCount,
      pending: pendingCount,
      succeeded: succeededCount,
      failed: failedCount
    },
    done
  });
}
