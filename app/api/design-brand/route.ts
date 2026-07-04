import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";

export const dynamic = "force-dynamic";

const fallbackBrand = {
  displayName: "Flawless",
  logoUrl: "/landing/flawless-lettering-logo.png",
  mode: "logo"
};

function resolveMode(brandDisplayMode: string, logoUrl: string | null) {
  const mode = brandDisplayMode === "name" || brandDisplayMode === "none" ? brandDisplayMode : "logo";
  return mode === "logo" && !logoUrl ? "name" : mode;
}

export async function GET(req: Request) {
  const accountSlug = new URL(req.url).searchParams.get("accountSlug")?.trim();

  if (accountSlug) {
    const account = await prisma.account.findUnique({
      where: { slug: accountSlug },
      select: {
        name: true,
        logoUrl: true,
        status: true,
        brandDisplayMode: true,
        StoreProfile: {
          select: { displayName: true, profileImageUrl: true, isPublished: true }
        }
      }
    });
    if (!account || account.status !== "active" || !account.StoreProfile?.isPublished) {
      return NextResponse.json({ error: "Store not found." }, { status: 404 });
    }
    const logoUrl = account.StoreProfile.profileImageUrl || account.logoUrl;
    const mode = resolveMode(account.brandDisplayMode, logoUrl);
    return NextResponse.json({
      displayName: account.StoreProfile.displayName || account.name,
      logoUrl: mode === "logo" ? logoUrl : null,
      mode
    });
  }

  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json(fallbackBrand);
  if (owner.role === "saas_admin") {
    return NextResponse.json(fallbackBrand);
  }

  const account = await prisma.account.findUnique({
    where: { id: owner.accountId },
    select: {
      name: true,
      logoUrl: true,
      brandDisplayMode: true,
      StoreProfile: { select: { displayName: true, profileImageUrl: true } }
    }
  });
  if (!account) return NextResponse.json(fallbackBrand);

  const logoUrl = account.StoreProfile?.profileImageUrl || account.logoUrl;
  const mode = resolveMode(account.brandDisplayMode, logoUrl);
  return NextResponse.json({
    displayName: account.StoreProfile?.displayName || account.name,
    logoUrl: mode === "logo" ? logoUrl : null,
    mode
  });
}
