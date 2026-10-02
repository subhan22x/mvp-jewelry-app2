import { NextResponse } from "next/server";
import { getPlatformAdminContext } from "@/src/lib/auth/platform-admin";
import { prisma } from "@/server/db/client";
import { z } from "zod";

export const dynamic = "force-dynamic";
const PageSize = 20;
const Params = z.object({
  q: z.string().trim().max(120).default(""),
  cursor: z.string().min(1).max(128).optional()
});

export async function GET(req: Request) {
  if (!await getPlatformAdminContext()) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const parsed = Params.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid Account search." }, { status: 400 });
  const { q: query, cursor } = parsed.data;

  const accounts = await prisma.account.findMany({
    where: {
      status: "active",
      ...(query ? { OR: [
        { name: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } }
      ] } : {})
    },
    select: { id: true, name: true, slug: true, StoreProfile: { select: { isPublished: true } } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: PageSize + 1
  });
  const items = accounts.slice(0, PageSize).map(({ StoreProfile, ...account }) => ({
    ...account,
    storefrontPublished: StoreProfile?.isPublished ?? false
  }));
  return NextResponse.json({
    items,
    nextCursor: accounts.length > PageSize ? items[items.length - 1].id : null
  }, { headers: { "Cache-Control": "private, no-store" } });
}
