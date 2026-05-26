import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";

const Body = z.object({
  requestId: z.string().min(1),
  videoId: z.string().min(1).optional(),
  designedImageUrl: z.string().min(1).optional(),
  videoUrl: z.string().min(1).optional(),
  diamondQuality: z.string().min(1).optional(),
  customerName: z.string().min(1).max(100).optional(),
  customerPhone: z.string().min(4).max(30).optional(),
  customerEmail: z.string().email().optional()
});

function normalizeContact(body: z.infer<typeof Body>, lead?: { name: string; phone: string; email: string } | null) {
  return {
    name: body.customerName?.trim() || lead?.name?.trim() || "",
    phone: body.customerPhone?.trim() || lead?.phone?.trim() || "",
    email: body.customerEmail?.trim() || lead?.email?.trim() || ""
  };
}

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    const request = await prisma.request.findUnique({
      where: { id: body.requestId },
      include: {
        Results: { orderBy: { variant: "asc" } },
        Videos: { orderBy: { createdAt: "desc" } }
      }
    });

    if (!request) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    const latestLead = await prisma.lead.findFirst({
      where: { accountId: request.accountId, requestId: request.id },
      orderBy: { createdAt: "desc" }
    });
    const contact = normalizeContact(body, latestLead);
    if (!contact.name || !contact.phone || !contact.email) {
      return NextResponse.json({
        error: "Customer contact information is required before requesting a quote."
      }, { status: 400 });
    }

    const betterResult = request.Results.find(result => result.variant === 1 && result.status === "succeeded" && result.imageUrl)
      ?? request.Results.find(result => result.status === "succeeded" && result.imageUrl)
      ?? null;
    const video = body.videoId
      ? request.Videos.find(entry => entry.id === body.videoId) ?? null
      : request.Videos.find(entry => entry.status === "succeeded" && entry.videoUrl) ?? request.Videos[0] ?? null;

    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        accountId: request.accountId,
        requestId: request.id,
        resultId: betterResult?.id ?? null,
        videoId: video?.id ?? null,
        designedImageUrl: body.designedImageUrl ?? betterResult?.imageUrl ?? video?.sourceImageUrl ?? null,
        videoUrl: body.videoUrl ?? video?.videoUrl ?? null,
        generatedAt: betterResult?.completedAt ?? betterResult?.createdAt ?? request.createdAt,
        productType: request.productType,
        pendantFinish: request.pendantFinish,
        styleId: request.styleId,
        text: request.text,
        twoTone: request.twoTone,
        primaryMetal: request.primaryMetal,
        secondaryMetal: request.secondaryMetal,
        emblem: request.emblem,
        size: request.size,
        metalType: request.metalType,
        stoneType: request.stoneType,
        plainColor: request.plainColor,
        plainMetal: request.plainMetal,
        plainKarat: request.plainKarat,
        plainChain: request.plainChain,
        diamondQuality: body.diamondQuality ?? null,
        customerName: contact.name,
        customerPhone: contact.phone,
        customerEmail: contact.email,
        status: "pending"
      }
    });

    return NextResponse.json({ quoteRequestId: quoteRequest.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "bad_request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
