import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db/client';
import { getDefaultAccountId } from '@/src/lib/account';

const Body = z.object({
  requestId: z.string().optional(),
  name:      z.string().min(1).max(100),
  phone:     z.string().min(4).max(30),
  email:     z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const accountId = body.requestId
      ? (await prisma.request.findUnique({ where: { id: body.requestId }, select: { accountId: true } }))?.accountId ?? getDefaultAccountId()
      : getDefaultAccountId();
    const lead = await prisma.lead.create({ data: { ...body, accountId } });
    return NextResponse.json({
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'bad_request' }, { status: 400 });
  }
}
