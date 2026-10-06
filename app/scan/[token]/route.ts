import { NextRequest, NextResponse } from "next/server";
import { nextQrKitCookieValue, QR_KIT_COOKIE, resolvePublicQrKit } from "@/src/lib/qr-kits/service";

export const dynamic = "force-dynamic";

function redirect(destination: URL) {
  const response = NextResponse.redirect(destination, 302);
  // Assignment changes the destination of the same permanent printed URL.
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolution = await resolvePublicQrKit(token);
  if (resolution.state !== "assigned") {
    return redirect(new URL(resolution.state === "unassigned" ? "/design" : "/qr-unavailable", req.url));
  }

  const { accountSlug } = resolution;
  const destination = new URL(`/s/${encodeURIComponent(accountSlug)}/design`, req.url);
  destination.searchParams.set("kit", token);
  const response = redirect(destination);
  response.cookies.set(QR_KIT_COOKIE, nextQrKitCookieValue(req.headers.get("cookie"), accountSlug, token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 4,
    path: "/"
  });
  return response;
}
