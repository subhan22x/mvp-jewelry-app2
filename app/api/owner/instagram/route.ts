import { NextResponse } from "next/server";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { checkInstagramProfile } from "@/src/lib/instagram-profile";

export async function GET(req: Request) {
  if (!await getOwnerContext()) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json(await checkInstagramProfile(new URL(req.url).searchParams.get("username")));
}
