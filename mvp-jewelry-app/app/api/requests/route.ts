import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db/client';
import { buildVariants } from '@/lib/styles/builder';
import { generateImage } from '@/lib/styles/connector';

const Body = z.object({
  userId: z.string(),
  styleId: z.string(),
  text: z.string(),
  twoTone: z.boolean(),
  primaryMetal: z.enum(['rose_gold','white_gold','yellow_gold']),
  secondaryMetal: z.enum(['rose_gold','white_gold','yellow_gold']).nullish(),
  emblem: z.enum(['none','crown','heart','spade','butterfly','moneybag']),
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());

    const request = await prisma.request.create({
      data: {
        userId: body.userId,
        styleId: body.styleId,
        text: body.text,
        twoTone: body.twoTone,
        primaryMetal: body.primaryMetal,
        secondaryMetal: body.secondaryMetal ?? null,
        emblem: body.emblem
      }
    });

    const variants = buildVariants({
      userId: body.userId,
      styleId: body.styleId,
      text: body.text,
      twoTone: body.twoTone,
      primaryMetal: body.primaryMetal,
      secondaryMetal: body.secondaryMetal ?? null,
      emblem: body.emblem
    });

    const results = [];
    for (const v of variants) {
      const { imageUrl } = await generateImage({
        prompt: v.prompt,
        attachments: v.attachments,
        requestId: request.id,
        variant: v.variant
      });
      const row = await prisma.result.create({
        data: { requestId: request.id, variant: v.variant, prompt: v.prompt, imageUrl }
      });
      results.push({ variant: row.variant, imageUrl: row.imageUrl });
    }

    return NextResponse.json({ requestId: request.id, results }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'bad_request' }, { status: 400 });
  }
}
