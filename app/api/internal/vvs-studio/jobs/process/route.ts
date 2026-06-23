import { NextResponse } from "next/server";
import { processVvsStudioJobsUntilIdle } from "@/src/lib/vvs-studio/pipeline";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.VVS_WORKER_SECRET ?? process.env.CRON_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") return true;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  const headerSecret = req.headers.get("x-vvs-worker-secret");
  return auth === `Bearer ${secret}` || headerSecret === secret;
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const results = await processVvsStudioJobsUntilIdle(240_000);
  return NextResponse.json({ results });
}

export async function GET(req: Request) {
  return POST(req);
}
