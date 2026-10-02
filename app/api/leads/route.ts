import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db/client';
import { getDefaultAccountId } from '@/src/lib/account';
import { resolveAccountIdFromSlug } from '@/src/lib/tenant';
import { ensureDraftQuoteForRequest } from '@/src/lib/quotes/ensure-draft-quote';
import { QrKitAttributionError, resolveQrKitAttributionFromRequest } from '@/src/lib/qr-kits/service';

const Body = z.object({
  requestId: z.string().optional(),
  accountSlug: z.string().min(1).optional(),
  name:      z.string().min(1).max(100),
  phone:     z.string().min(4).max(30),
  email:     z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const { accountSlug, ...leadData } = body;
    const request = body.requestId
      ? await prisma.request.findUnique({ where: { id: body.requestId }, select: { accountId: true, qrKitId: true } })
      : null;
    if (body.requestId && !request) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }
    const accountId = request?.accountId
      ?? await resolveAccountIdFromSlug(accountSlug)
      ?? getDefaultAccountId();
    const qrKitAttribution = request?.qrKitId
      ? { qrKitId: request.qrKitId }
      : await resolveQrKitAttributionFromRequest(req, accountSlug);
    const lead = await prisma.lead.create({ data: { ...leadData, accountId, qrKitId: qrKitAttribution.qrKitId } });
    if (lead.requestId) {
      await ensureDraftQuoteForRequest(lead.requestId).catch(error => {
        console.error(`[quote draft ${lead.requestId}] automatic creation failed:`, error);
      });
    }
    return NextResponse.json({
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email
    }, { status: 201 });
  } catch (err: any) {
    if (err instanceof QrKitAttributionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: err.message ?? 'bad_request' }, { status: 400 });
  }
}
