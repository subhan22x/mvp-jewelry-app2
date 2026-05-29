import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import { isOwnerRequestAuthenticated } from "@/src/lib/owner-auth";

const Body = z.object({
  quotedPriceCents: z.number().int().nonnegative().optional(),
  quoteNotes: z.string().max(2000).optional(),
  estimatedDelivery: z.string().max(120).optional().nullable(),
  quoteMaterial: z.string().max(80).optional().nullable(),
  quoteMaterialKarat: z.string().max(20).optional().nullable(),
  quoteStoneType: z.string().max(80).optional().nullable(),
  status: z.enum(["pending", "priced", "sent", "closed"]).optional()
});

function cleanOptional(value: string | null | undefined) {
  return value?.trim() || null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isOwnerRequestAuthenticated(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = Body.parse(await req.json());
    const accountId = getDefaultAccountId();
    const existing = await prisma.quoteRequest.findFirst({
      where: { id: params.id, accountId },
      select: { id: true }
    });
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const data = {
      quotedPriceCents: body.quotedPriceCents,
      quoteNotes: body.quoteNotes,
      status: body.status,
      ...(body.estimatedDelivery !== undefined ? { estimatedDelivery: cleanOptional(body.estimatedDelivery) } : {}),
      ...(body.quoteMaterial !== undefined ? { quoteMaterial: cleanOptional(body.quoteMaterial) } : {}),
      ...(body.quoteMaterialKarat !== undefined ? { quoteMaterialKarat: cleanOptional(body.quoteMaterialKarat) } : {}),
      ...(body.quoteStoneType !== undefined ? { quoteStoneType: cleanOptional(body.quoteStoneType) } : {}),
    };

    const quoteRequest = await prisma.quoteRequest.update({
      where: { id: params.id },
      data
    });

    return NextResponse.json({
      id: quoteRequest.id,
      quotedPriceCents: quoteRequest.quotedPriceCents,
      quoteNotes: quoteRequest.quoteNotes,
      estimatedDelivery: quoteRequest.estimatedDelivery,
      quoteMaterial: quoteRequest.quoteMaterial,
      quoteMaterialKarat: quoteRequest.quoteMaterialKarat,
      quoteStoneType: quoteRequest.quoteStoneType,
      status: quoteRequest.status
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "bad_request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
