import { NextRequest, NextResponse } from "next/server";
import { nextQrKitCookieValue, QR_KIT_COOKIE, resolvePublicQrKit } from "@/src/lib/qr-kits/service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const accountSlug = await resolvePublicQrKit(token);
  if (!accountSlug) {
    return NextResponse.redirect(new URL("/qr-unavailable", req.url), 302);
  }

  const destination = new URL(`/s/${encodeURIComponent(accountSlug)}/design`, req.url);
  destination.searchParams.set("kit", token);
  const response = NextResponse.redirect(destination, 302);
  response.cookies.set(QR_KIT_COOKIE, nextQrKitCookieValue(req.headers.get("cookie"), accountSlug, token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 4,
    path: "/"
  });
  return response;
}
