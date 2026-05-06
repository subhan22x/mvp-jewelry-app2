import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/db/client';
import { buildVariants } from '@/lib/styles/builder';
import { generateImage } from '@/lib/styles/connector';
import { getNamePromptMode } from '@/src/lib/prompt-mode';

const Body = z.object({
  userId: z.string(),
  styleId: z.string(),
  text: z.string(),
  twoTone: z.boolean(),
  primaryMetal: z.enum(['rose_gold','white_gold','yellow_gold']),
  secondaryMetal: z.enum(['rose_gold','white_gold','yellow_gold']).nullish(),
  emblem: z.enum(['none','crown','heart','spade','butterfly','moneybag']),
});

function getGenerationErrorMessage(err: unknown): string {
  const fallback = 'Image generation failed.';
  if (!(err instanceof Error)) return fallback;

  const match = err.message.match(/\{.*\}/s);
  if (!match) return err.message || fallback;

  try {
    const parsed = JSON.parse(match[0]);
    const message = parsed?.error?.message ?? parsed?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  } catch {
    return err.message || fallback;
  }
}

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());

    const request = await prisma.request.create({
      data: {
        userId: body.userId,
        productType: 'name',
        styleId: body.styleId,
        text: body.text,
        twoTone: body.twoTone,
        primaryMetal: body.primaryMetal,
        secondaryMetal: body.secondaryMetal ?? null,
        emblem: body.emblem
      }
    });

    const promptMode = await getNamePromptMode();
    const variants = buildVariants({
      userId: body.userId,
      styleId: body.styleId,
      text: body.text,
      twoTone: body.twoTone,
      primaryMetal: body.primaryMetal,
      secondaryMetal: body.secondaryMetal ?? null,
      emblem: body.emblem
    }, { promptMode });

    const attemptRows = await Promise.all(variants.map((v) => {
      const startedAt = new Date();
      return prisma.result.create({
        data: {
          requestId: request.id,
          variant: v.variant,
          prompt: v.prompt,
          status: 'pending',
          startedAt
        }
      });
    }));

    // Fire all generation tasks in parallel without blocking the response.
    // Note: in a Vercel production deploy, use `waitUntil` from @vercel/functions
    // to ensure the Lambda stays alive until all tasks complete.
    void Promise.all(variants.map(async (v, index) => {
      const attempt = attemptRows[index];
      const startedMs = attempt.startedAt?.getTime() ?? Date.now();
      try {
        const { imageUrl, modelId } = await generateImage({
          prompt: v.prompt,
          attachments: v.attachments,
          requestId: request.id,
          variant: v.variant
        });
        const completedAt = new Date();
        await prisma.result.update({
          where: { id: attempt.id },
          data: {
            imageUrl,
            modelId,
            status: 'succeeded',
            error: null,
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedMs)
          }
        });
      } catch (err) {
        console.error(`[variant ${v.variant}] generation failed:`, err);
        const completedAt = new Date();
        await prisma.result.update({
          where: { id: attempt.id },
          data: {
            status: 'failed',
            error: getGenerationErrorMessage(err),
            completedAt,
            durationMs: Math.max(0, completedAt.getTime() - startedMs)
          }
        });
      }
    }));

    return NextResponse.json({ requestId: request.id }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'bad_request' }, { status: 400 });
  }
}
