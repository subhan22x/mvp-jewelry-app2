import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";

type Ctx = { params: { accountSlug: string } };

const reviewSchema = z.object({
  reviewerName: z.string().trim().min(1, "Name is required.").max(120),
  reviewerPhone: z.string().trim().max(80).optional().or(z.literal("")),
  reviewerEmail: z.string().trim().email("Enter a valid email.").optional().or(z.literal("")),
  reviewerInstagram: z.string().trim().max(80).optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  reviewText: z.string().trim().min(5, "Review must be at least 5 characters.").max(2000),
});

function cleanInstagram(value?: string) {
  return value?.replace(/^@+/, "").trim() || null;
}

function optional(value?: string) {
  return value?.trim() || null;
}

export async function POST(req: Request, { params }: Ctx) {
  try {
    const account = await prisma.account.findUnique({
      where: { slug: params.accountSlug },
      select: { id: true, StoreProfile: { select: { isPublished: true } } },
    });
    if (!account || !account.StoreProfile?.isPublished) {
      return NextResponse.json({ error: "Store profile not found." }, { status: 404 });
    }

    const body = reviewSchema.parse(await req.json());
    const reviewerPhone = optional(body.reviewerPhone);
    const reviewerEmail = optional(body.reviewerEmail);
    const reviewerInstagram = cleanInstagram(body.reviewerInstagram);
    if (!reviewerPhone && !reviewerEmail && !reviewerInstagram) {
      return NextResponse.json({ error: "Enter a phone, email, or Instagram so the owner can verify the review." }, { status: 400 });
    }

    const review = await prisma.storeReview.create({
      data: {
        accountId: account.id,
        reviewerName: body.reviewerName,
        reviewerPhone,
        reviewerEmail,
        reviewerInstagram,
        rating: body.rating,
        reviewText: body.reviewText,
        status: "published",
        source: "public_profile",
      },
    });

    return NextResponse.json({ reviewId: review.id }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid review." }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unable to submit review.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
