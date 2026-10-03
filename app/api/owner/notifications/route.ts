import { NextResponse } from "next/server";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { getNotificationPreferences, preferenceSchema, saveNotificationPreferences } from "@/src/lib/notifications/preferences";

export async function GET() {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const preferences = await getNotificationPreferences(owner.accountId);
  return NextResponse.json({ ...preferences, loginEmail: owner.email, email: preferences.emailOverride ?? owner.email });
}

export async function POST(req: Request) {
  const owner = await getOwnerContext();
  if (!owner) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let payload: unknown;
  try { payload = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = preferenceSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address. SMS notifications are not available yet." }, { status: 400 });
  if (parsed.data.enabled && !(parsed.data.emailOverride ?? owner.email)) return NextResponse.json({ error: "Enter a notification email address." }, { status: 400 });
  const preferences = await saveNotificationPreferences(owner.accountId, parsed.data);
  return NextResponse.json({ ...preferences, loginEmail: owner.email, email: preferences.emailOverride ?? owner.email });
}
