import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";

export const dynamic = "force-dynamic";

const fallbackBrand = {
  displayName: "Flawless",
  logoUrl: "/landing/flawless-lettering-logo.png",
  logoStyle: "wordmark"
};

export async function GET(req: Request) {
  const accountSlug = new URL(req.url).searchParams.get("accountSlug")?.trim();

  if (accountSlug) {
    const account = await prisma.account.findUnique({
      where: { slug: accountSlug },
      select: {
        name: true,
        logoUrl: true,
        status: true,
        StoreProfile: {
          select: { displayName: true, profileImageUrl: true, isPublished: true }
        }
      }
    });
    if (!account || account.status !== "active" || !account.StoreProfile?.isPublished) {
      return NextResponse.json({ error: "Store not found." }, { status: 404 });
    }
    return NextResponse.json({
      displayName: account.StoreProfile.displayName || account.name,
      logoUrl: account.StoreProfile.profileImageUrl || account.logoUrl
    });
  }

  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json(fallbackBrand);
  if (owner.role === "saas_admin") {
    return NextResponse.json({
      displayName: "Flawless",
      logoUrl: "/landing/flawless-lettering-logo.png",
      logoStyle: "wordmark"
    });
  }

  const account = await prisma.account.findUnique({
    where: { id: owner.accountId },
    select: {
      name: true,
      logoUrl: true,
      StoreProfile: { select: { displayName: true, profileImageUrl: true } }
    }
  });
  if (!account) return NextResponse.json(fallbackBrand);

  return NextResponse.json({
    displayName: account.StoreProfile?.displayName || account.name,
    logoUrl: account.StoreProfile?.profileImageUrl || account.logoUrl
  });
}
