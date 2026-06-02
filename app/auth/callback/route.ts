import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { createClient } from "@/src/lib/supabase/server";
import { safeInternalPath } from "@/src/lib/auth/redirect";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  if (!code) return NextResponse.redirect(new URL("/login?error=missing_confirmation_code", url));

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(new URL("/login?error=invalid_confirmation_link", url));

  const appUser = await prisma.user.findUnique({
    where: { authUserId: data.user.id },
    select: {
      Memberships: {
        where: { status: "pending_verification" },
        select: { id: true, accountId: true }
      }
    }
  });
  if (!appUser) return NextResponse.redirect(new URL("/login?error=owner_account_not_found", url));

  const membershipIds = appUser.Memberships.map(membership => membership.id);
  const accountIds = appUser.Memberships.map(membership => membership.accountId);
  if (membershipIds.length > 0) {
    await prisma.$transaction([
      prisma.accountMembership.updateMany({
        where: { id: { in: membershipIds } },
        data: { status: "active" }
      }),
      prisma.account.updateMany({
        where: { id: { in: accountIds } },
        data: { status: "active" }
      }),
      prisma.storeProfile.updateMany({
        where: { accountId: { in: accountIds } },
        data: { isPublished: true }
      })
    ]);
  }

  return NextResponse.redirect(new URL(safeInternalPath(next), url));
}
