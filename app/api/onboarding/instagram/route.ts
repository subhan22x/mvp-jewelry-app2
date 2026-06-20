import { NextResponse } from "next/server";
import { checkInstagramProfile } from "@/src/lib/instagram-profile";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return NextResponse.json(await checkInstagramProfile(new URL(req.url).searchParams.get("username")));
}
