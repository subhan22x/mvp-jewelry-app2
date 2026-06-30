import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/src/lib/supabase/middleware";
import { safeInternalPath } from "@/src/lib/auth/redirect";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" && searchParams.has("code")) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    callbackUrl.searchParams.set("next", safeInternalPath(searchParams.get("next"), "/onboarding"));
    return NextResponse.redirect(callbackUrl);
  }

  if (pathname === "/" && (searchParams.has("error") || searchParams.has("error_code"))) {
    const confirmUrl = request.nextUrl.clone();
    confirmUrl.pathname = "/auth/confirm";
    confirmUrl.searchParams.set("next", safeInternalPath(searchParams.get("next"), "/onboarding"));
    return NextResponse.redirect(confirmUrl);
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
