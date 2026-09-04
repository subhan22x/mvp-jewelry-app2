import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { SMS_CONSENT_SOURCE, smsConsentRecord } from "@/src/lib/sms-consent";

const updateSchema = z.object({
  phone: z.string().trim().max(30).nullable().optional(),
  enabled: z.boolean()
});

function responseSettings(profile: {
  smsNotificationPhone: string | null;
  smsNotificationsEnabled: boolean;
  smsConsentAt: Date | null;
  smsConsentSource: string | null;
  smsConsentVersion: string | null;
  smsOptedOutAt: Date | null;
}) {
  return {
    smsNotificationPhone: profile.smsNotificationPhone,
    smsNotificationsEnabled: profile.smsNotificationsEnabled,
    smsConsentAt: profile.smsConsentAt,
    smsConsentSource: profile.smsConsentSource,
    smsConsentVersion: profile.smsConsentVersion,
    smsOptedOutAt: profile.smsOptedOutAt
  };
}

async function ownerAccount() {
  const owner = await getOwnerContext();
  if (!owner) return null;

  const account = await prisma.account.findUnique({
    where: { id: owner.accountId },
    select: { id: true, name: true, StoreProfile: true }
  });

  return account ? { owner, account } : { owner, account: null };
}

export async function GET() {
  const context = await ownerAccount();
  if (!context) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!context.account) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const profile = context.account.StoreProfile;
  return NextResponse.json(profile
    ? responseSettings(profile)
    : {
        smsNotificationPhone: null,
        smsNotificationsEnabled: false,
        smsConsentAt: null,
        smsConsentSource: null,
        smsConsentVersion: null,
        smsOptedOutAt: null
      });
}

export async function POST(req: Request) {
  const context = await ownerAccount();
  if (!context) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!context.account) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid notification settings." }, { status: 400 });
  }

  const current = context.account.StoreProfile;
  const requestedPhone = parsed.data.phone === undefined
    ? current?.smsNotificationPhone ?? null
    : parsed.data.phone || null;

  if (parsed.data.enabled && !requestedPhone) {
    return NextResponse.json({ error: "Enter a phone number to enable text notifications." }, { status: 400 });
  }

  const consentChanged = parsed.data.enabled && (
    !current?.smsNotificationsEnabled
    || requestedPhone !== current.smsNotificationPhone
  );
  const now = new Date();
  const notificationData = {
    smsNotificationPhone: requestedPhone,
    smsNotificationsEnabled: parsed.data.enabled,
    ...(consentChanged ? smsConsentRecord(SMS_CONSENT_SOURCE.settings, now) : {}),
    ...(!parsed.data.enabled ? { smsOptedOutAt: now } : {})
  };

  const profile = await prisma.storeProfile.upsert({
    where: { accountId: context.account.id },
    update: notificationData,
    create: {
      accountId: context.account.id,
      displayName: context.account.name,
      ...notificationData
    }
  });

  return NextResponse.json(responseSettings(profile));
}
