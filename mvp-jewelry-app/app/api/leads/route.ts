import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db/client';

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

const Body = z.object({
  requestId: z.string().optional(),
  name:      z.string().min(1).max(100),
  phone:     z.string().min(4).max(30),
  email:     z.string().email(),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const lead = await prisma.lead.create({ data: body });
    return NextResponse.json({
      leadId: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email
    }, { status: 201, headers: corsHeaders() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'bad_request' }, { status: 400, headers: corsHeaders() });
  }
}
