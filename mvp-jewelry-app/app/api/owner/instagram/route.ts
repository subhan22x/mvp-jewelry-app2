import { NextResponse } from "next/server";
import { isOwnerRequestAuthenticated } from "@/src/lib/owner-auth";

function cleanHandle(value: string | null) {
  return value?.replace(/^@+/, "").trim().toLowerCase() ?? "";
}

function isValidInstagramHandle(value: string) {
  return /^[a-z0-9._]{1,30}$/.test(value) && !value.includes("..") && !value.startsWith(".") && !value.endsWith(".");
}

export async function GET(req: Request) {
  if (!isOwnerRequestAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const handle = cleanHandle(new URL(req.url).searchParams.get("username"));
  if (!handle || !isValidInstagramHandle(handle)) {
    return NextResponse.json({ username: handle, exists: false, status: "invalid" });
  }

  try {
    const response = await fetch(`https://www.instagram.com/${encodeURIComponent(handle)}/`, {
      cache: "no-store",
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JewelryStudioBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (response.status === 404) {
      return NextResponse.json({ username: handle, exists: false, status: "not_found" });
    }
    if (response.ok) {
      const html = await response.text();
      const hasProfileSignals = html.includes(`instagram.com/${handle}`) || html.includes(`@${handle}`) || html.includes(`"username":"${handle}"`);
      return NextResponse.json({ username: handle, exists: hasProfileSignals, status: hasProfileSignals ? "found" : "unknown" });
    }

    return NextResponse.json({ username: handle, exists: null, status: "unknown" });
  } catch {
    return NextResponse.json({ username: handle, exists: null, status: "unknown" });
  }
}
