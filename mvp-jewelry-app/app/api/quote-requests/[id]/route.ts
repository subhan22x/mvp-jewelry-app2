import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import { isOwnerRequestAuthenticated } from "@/src/lib/owner-auth";

const Body = z.object({
  quotedPriceCents: z.number().int().nonnegative().optional(),
  quoteNotes: z.string().max(2000).optional(),
  status: z.enum(["pending", "priced", "sent", "closed"]).optional()
});

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

    const quoteRequest = await prisma.quoteRequest.update({
      where: { id: params.id },
      data: {
        quotedPriceCents: body.quotedPriceCents,
        quoteNotes: body.quoteNotes,
        status: body.status
      }
    });

    return NextResponse.json({
      id: quoteRequest.id,
      quotedPriceCents: quoteRequest.quotedPriceCents,
      quoteNotes: quoteRequest.quoteNotes,
      status: quoteRequest.status
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "bad_request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
