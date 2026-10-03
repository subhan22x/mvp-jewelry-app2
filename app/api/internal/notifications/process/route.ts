import { NextResponse } from "next/server";
import { notificationWorkerAuthorized, processOwnerNotifications } from "@/src/lib/notifications/worker";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!notificationWorkerAuthorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json(await processOwnerNotifications());
}
export const GET = POST;
