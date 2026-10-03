import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";

export const preferenceSchema = z.object({
  enabled: z.boolean(),
  // The settings form posts an empty value when an override is cleared.
  // Normalize it here so disabling notifications never requires a syntactically
  // valid address that will not be used.
  emailOverride: z.preprocess(value => typeof value === "string" && !value.trim() ? null : value, z.string().trim().max(254).email().nullable()),
  smsEnabled: z.literal(false).default(false)
}).strict();
export type NotificationPreferences = z.infer<typeof preferenceSchema>;
export const defaultPreferences: NotificationPreferences = { enabled: true, emailOverride: null, smsEnabled: false };
export const preferenceKey = (accountId: string) => `${accountId}:owner_notifications_v1`;

export async function getNotificationPreferences(accountId: string, db: Pick<Prisma.TransactionClient, "appSetting"> = prisma) {
  const setting = await db.appSetting.findUnique({ where: { key: preferenceKey(accountId) } });
  if (!setting) return { ...defaultPreferences };
  try {
    const parsed = preferenceSchema.safeParse(JSON.parse(setting.value));
    if (parsed.success) return parsed.data;
  } catch { /* A malformed setting must not enable delivery. */ }
  return { ...defaultPreferences, enabled: false };
}

export async function saveNotificationPreferences(accountId: string, input: NotificationPreferences) {
  const preferences = preferenceSchema.parse(input);
  const key = preferenceKey(accountId);
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: JSON.stringify(preferences) },
    create: { key, accountId, value: JSON.stringify(preferences) }
  });
  return preferences;
}

export async function ownerNotificationRecipient(accountId: string, preferences: NotificationPreferences) {
  const membership = await prisma.accountMembership.findFirst({
    where: { accountId, role: "owner", status: "active", account: { status: "active" }, user: { authUserId: { not: null } } },
    orderBy: { createdAt: "asc" },
    select: { user: { select: { email: true } } }
  });
  if (!membership) return null;
  const address = preferences.emailOverride ?? membership.user.email;
  return z.string().email().safeParse(address).success ? address : null;
}
