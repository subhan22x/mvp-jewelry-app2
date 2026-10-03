import { NextResponse } from "next/server";
import { notificationWorkerAuthorized, processOwnerNotifications } from "@/src/lib/notifications/worker";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const batchSchema = z.object({ limit: z.number().int().min(1).max(5).optional() }).strict();

export async function POST(req: Request) {
  if (!notificationWorkerAuthorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let limit: number | undefined;
  if (req.method === "POST") {
    const body = await req.text();
    if (body.length > 100) return NextResponse.json({ error: "Invalid batch." }, { status: 400 });
    if (body.trim()) {
      let parsed;
      try { parsed = batchSchema.safeParse(JSON.parse(body)); }
      catch { return NextResponse.json({ error: "Invalid batch." }, { status: 400 }); }
      if (!parsed.success) return NextResponse.json({ error: "Invalid batch." }, { status: 400 });
      limit = parsed.data.limit;
    }
  }
  return NextResponse.json(await processOwnerNotifications(limit));
}
export const GET = POST;
