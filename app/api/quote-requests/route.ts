import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { usageErrorResponse } from "@/src/lib/usage";
import { ensureDraftQuoteForRequest } from "@/src/lib/quotes/ensure-draft-quote";

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
      select: { id: true, accountId: true }
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

    if (!latestLead) {
      await prisma.lead.create({
        data: {
          accountId: request.accountId,
          requestId: request.id,
          name: contact.name,
          phone: contact.phone,
          email: contact.email
        }
      });
    }

    const ensured = await ensureDraftQuoteForRequest(request.id);
    if (!ensured.ok) {
      return NextResponse.json({ error: "A successful generated image is required before preparing a quote." }, { status: 409 });
    }
    const update = await prisma.quoteRequest.updateMany({
      where: { id: ensured.quoteRequestId, status: "pending" },
      data: {
        customerName: contact.name,
        customerPhone: contact.phone,
        customerEmail: contact.email,
        ...(body.diamondQuality ? { diamondQuality: body.diamondQuality } : {})
      }
    });
    if (update.count === 0) {
      return NextResponse.json({ quoteRequestId: ensured.quoteRequestId }, { status: 200 });
    }

    return NextResponse.json({ quoteRequestId: ensured.quoteRequestId }, { status: ensured.created ? 201 : 200 });
  } catch (err) {
    const usage = usageErrorResponse(err);
    if (usage) return NextResponse.json(usage, { status: 402 });
    const message = err instanceof Error ? err.message : "bad_request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
