import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getPlatformAdminContext } from "@/src/lib/auth/platform-admin";
import { QR_KIT_STATUSES } from "@/src/lib/qr-kits/types";

const Query = z.object({
  cursor: z.string().optional(),
  search: z.string().trim().max(80).optional(),
  status: z.enum(QR_KIT_STATUSES).optional()
});

export async function GET(req: Request) {
  if (!await getPlatformAdminContext()) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const parsed = Query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid QR kit query." }, { status: 400 });
  const { cursor, search, status } = parsed.data;
  const text = search || undefined;

  const kits = await prisma.qrKit.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(text ? {
        OR: [
          { displayCode: { contains: text, mode: "insensitive" } },
          { account: { is: { name: { contains: text, mode: "insensitive" } } } },
          { account: { is: { slug: { contains: text, mode: "insensitive" } } } }
        ]
      } : {})
    },
    select: {
      id: true,
      displayCode: true,
      status: true,
      assignedAt: true,
      deployedAt: true,
      createdAt: true,
      batch: { select: { code: true, label: true, printTemplateVersion: true } },
      account: { select: { id: true, name: true, slug: true } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });

  const hasMore = kits.length > 50;
  const items = hasMore ? kits.slice(0, 50) : kits;
  return NextResponse.json({ items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null });
}
