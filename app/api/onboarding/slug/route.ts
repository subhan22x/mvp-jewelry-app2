import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { slugify } from "@/src/lib/slug";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = slugify(searchParams.get("value") ?? "");
  if (!slug) return NextResponse.json({ slug, available: false });

  const existing = await prisma.account.findUnique({
    where: { slug },
    select: { id: true }
  });

  return NextResponse.json({ slug, available: !existing });
}
