import { NextResponse } from "next/server";
import { getOwnerContext } from "@/src/lib/auth/owner-context";

export async function GET() {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "No active store account is linked to this login." }, { status: 403 });
  return NextResponse.json({ accountId: owner.accountId });
}
