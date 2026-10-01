import { NextResponse } from "next/server";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { getSignupCredits } from "@/src/lib/billing/signup-credits";
export const dynamic = "force-dynamic";
export async function GET() {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getSignupCredits(owner.accountId), { headers: { "Cache-Control": "no-store" } });
}
