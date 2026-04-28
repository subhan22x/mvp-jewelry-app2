import { NextResponse } from 'next/server';
import { prisma } from '@/server/db/client';

export async function GET(_: Request, { params }: { params: { id: string }}) {
  const reqRow = await prisma.request.findUnique({
    where: { id: params.id },
    include: { Results: { orderBy: { variant: 'asc' } } }
  });
  if (!reqRow) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    id: reqRow.id,
    styleId: reqRow.styleId,
    text: reqRow.text,
    metals: { twoTone: reqRow.twoTone, primary: reqRow.primaryMetal, secondary: reqRow.secondaryMetal },
    emblem: reqRow.emblem,
    results: reqRow.Results.map(r => ({ variant: r.variant, imageUrl: r.imageUrl }))
  });
}
