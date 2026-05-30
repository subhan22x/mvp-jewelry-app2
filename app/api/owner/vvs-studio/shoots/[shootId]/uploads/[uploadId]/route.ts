import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";

type Ctx = { params: { shootId: string; uploadId: string } };

export async function DELETE(_req: Request, { params }: Ctx) {
  const accountId = getDefaultAccountId();
  const upload = await prisma.vvsStudioUpload.findUnique({ where: { id: params.uploadId } });
  if (!upload || upload.accountId !== accountId || upload.shootId !== params.shootId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  await prisma.vvsStudioUpload.delete({ where: { id: upload.id } });
  return NextResponse.json({ ok: true });
}
