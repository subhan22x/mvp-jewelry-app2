import { NextResponse } from "next/server";
import { isOwnerRequestAuthenticated } from "@/src/lib/owner-auth";

function normalizeUrl(value: string | null) {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

function isAllowedUrl(url: URL) {
  return ["http:", "https:"].includes(url.protocol) && !["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
}

export async function GET(req: Request) {
  if (!isOwnerRequestAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = normalizeUrl(new URL(req.url).searchParams.get("url"));
  if (!url || !isAllowedUrl(url)) {
    return NextResponse.json({ url: url?.toString() ?? "", exists: false, status: "invalid" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);

  try {
    let response = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JewelryStudioBot/1.0)" },
    });

    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; JewelryStudioBot/1.0)" },
      });
    }

    clearTimeout(timeout);
    return NextResponse.json({
      url: url.toString(),
      exists: true,
      status: "found",
      httpStatus: response.status,
    });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({ url: url.toString(), exists: null, status: "unknown" });
  }
}
