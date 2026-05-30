import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { savePublicUpload } from "@/src/lib/storage/public-media";

export const dynamic = "force-dynamic";

const quoteSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional()
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request, { params }: { params: { accountSlug: string } }) {
  const account = await prisma.account.findUnique({
    where: { slug: params.accountSlug },
    include: { StoreProfile: true }
  });
  if (!account || !account.StoreProfile?.isPublished) return jsonError("Store profile not found.", 404);

  const form = await req.formData();
  const parsed = quoteSchema.safeParse({
    name: form.get("name"),
    phone: form.get("phone"),
    email: form.get("email") ?? "",
    notes: form.get("notes") ?? ""
  });
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid quote request.");
  }

  const images = form.getAll("images").filter((value): value is File => value instanceof File && value.size > 0).slice(0, 6);
  if (images.length === 0) return jsonError("Upload at least one reference image.");

  const imageUrls: string[] = [];
  for (const [index, image] of images.entries()) {
    const imageUrl = await savePublicUpload(image, `accounts/${account.id}/quote-requests`, `${Date.now()}-${index + 1}`);
    imageUrls.push(imageUrl);
  }

  const lead = await prisma.lead.create({
    data: {
      accountId: account.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || ""
    }
  });

  const quote = await prisma.quoteRequest.create({
    data: {
      accountId: account.id,
      productType: "general_quote",
      designedImageUrl: imageUrls[0] ?? null,
      referenceImageUrlsJson: JSON.stringify(imageUrls),
      customerName: parsed.data.name,
      customerPhone: parsed.data.phone,
      customerEmail: parsed.data.email || "",
      quoteNotes: parsed.data.notes || null,
      status: "pending"
    }
  });

  return NextResponse.json({
    quoteRequestId: quote.id,
    leadId: lead.id,
    imageUrls
  });
}
