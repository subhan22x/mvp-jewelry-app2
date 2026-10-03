import type { Prisma } from "@prisma/client";
import { getNotificationPreferences } from "./preferences";
import { scheduleBackgroundTask } from "@/src/lib/platform/background";

export async function enqueueOwnerNotification(db: Prisma.TransactionClient, event: { accountId: string; quoteRequestId: string; kind: "generated_design" | "submitted_quote" }) {
  const preferences = await getNotificationPreferences(event.accountId, db);
  return db.ownerNotification.create({ data: {
    ...event, channel: "email", deduplicationKey: `new_customer_request:${event.quoteRequestId}:email`,
    status: preferences.enabled ? "queued" : "skipped",
    lastError: preferences.enabled ? null : "notifications_disabled"
  } });
}

export function nudgeOwnerNotifications() {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_EMAIL_FROM) return;
  scheduleBackgroundTask(import("./worker").then(module => module.processOwnerNotifications(5)), "owner-notifications");
}
