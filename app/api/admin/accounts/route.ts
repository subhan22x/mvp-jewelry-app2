import { NextResponse } from "next/server";
import { getPlatformAdminContext } from "@/src/lib/auth/platform-admin";
import { prisma } from "@/server/db/client";

export async function GET(req: Request) {
  if (!await getPlatformAdminContext()) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const query = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ items: [] });

  const items = await prisma.account.findMany({
    where: {
      status: "active",
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { slug: { contains: query, mode: "insensitive" } }
      ]
    },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
    take: 12
  });
  return NextResponse.json({ items });
}
