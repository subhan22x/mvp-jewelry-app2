import { randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "@/server/db/client";
import { Prisma, type NotificationWebhookEvent } from "@prisma/client";
import { buildOwnerNotificationEmail, emailPayloadSchema, notificationBaseUrl } from "./email";
import { getNotificationPreferences, ownerNotificationRecipient } from "./preferences";

export const RETRY_WINDOW_MS = 23 * 60 * 60_000;
const LEASE_MS = 2 * 60_000;
const MAX_ATTEMPTS = 6;
export function notificationWorkerAuthorized(req: Request) {
  const secret = process.env.NOTIFICATION_WORKER_SECRET || process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function canRetryDelivery(firstAttemptAt: Date, attemptCount: number, now = new Date()) {
  return attemptCount < MAX_ATTEMPTS && now.getTime() - firstAttemptAt.getTime() < RETRY_WINDOW_MS;
}

const webhookStates: Record<string, { status: string; previous: string[] }> = {
  'email.sent': { status: 'sent', previous: ['processing', 'queued'] },
  'email.delivered': { status: 'delivered', previous: ['processing', 'queued', 'sent'] },
  'email.failed': { status: 'failed', previous: ['processing', 'queued', 'sent'] },
  'email.bounced': { status: 'bounced', previous: ['processing', 'queued', 'sent', 'delivered', 'failed'] },
  'email.complained': { status: 'complained', previous: ['processing', 'queued', 'sent', 'delivered', 'failed', 'bounced'] },
  'email.suppressed': { status: 'bounced', previous: ['processing', 'queued', 'sent', 'failed'] }
};

type QuoteImages = { referenceImageUrlsJson: string | null; request: { Results?: { imageUrl: string | null; status: string }[] } | null };
// Up to four images go in the alert: every successful generated variant, or the customer's uploaded references.
function notificationImages(quote: QuoteImages) {
  const results = quote.request?.Results ?? [];
  if (results.length) {
    return {
      imageUrls: results.filter(result => result.status === 'succeeded').map(result => result.imageUrl),
      pendingImageCount: results.filter(result => result.status === 'pending').length
    };
  }
  try {
    const urls: unknown = quote.referenceImageUrlsJson ? JSON.parse(quote.referenceImageUrlsJson) : [];
    return { imageUrls: Array.isArray(urls) ? urls.filter((url): url is string => typeof url === 'string') : [] };
  } catch { return { imageUrls: [] }; }
}

export async function reconcileNotificationWebhooks() {
  // Do not let unrelated emails in the same Resend team starve reconciliation.
  // Unmatched early webhooks stay durable and become eligible after send returns.
  const events = await prisma.$queryRaw<NotificationWebhookEvent[]>(Prisma.sql`
    SELECT e.* FROM "NotificationWebhookEvent" e
    JOIN "OwnerNotification" n ON n."providerMessageId" = e."providerMessageId"
    WHERE e."processedAt" IS NULL ORDER BY e."occurredAt" ASC LIMIT 100
  `);
  for (const event of events) {
    const delivery = await prisma.ownerNotification.findUnique({ where: { providerMessageId: event.providerMessageId }, select: { id: true } });
    if (!delivery) continue; // The webhook may arrive before the provider response is persisted.
    const state = webhookStates[event.type];
    await prisma.$transaction(async tx => {
      if (state) await tx.ownerNotification.updateMany({
        where: { id: delivery.id, status: { in: state.previous } },
        data: { status: state.status, ...(state.status === 'delivered' ? { deliveredAt: event.occurredAt } : {}) }
      });
      await tx.notificationWebhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
    });
  }
}

export async function processOwnerNotifications(limit = 20) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const sender = process.env.NOTIFICATION_EMAIL_FROM?.trim();
  if (!apiKey || !sender) {
    return {
      processed: 0,
      configured: false,
      configurationError: !apiKey ? "resend_api_key_missing" : "notification_email_from_missing"
    };
  }
  // Fail before claiming anything if the trusted deployment URL is unavailable.
  let baseUrl: string;
  try {
    baseUrl = notificationBaseUrl();
  } catch (error) {
    const code = error instanceof Error && /^notification_base_url_(missing|invalid)$/.test(error.message)
      ? error.message
      : "notification_base_url_invalid";
    return { processed: 0, configured: false, configurationError: code };
  }
  await reconcileNotificationWebhooks();
  let processed = 0;
  for (let index = 0; index < Math.min(Math.max(limit, 1), 20); index++) {
    const now = new Date();
    const candidate = await prisma.ownerNotification.findFirst({
      where: { channel: 'email', OR: [{ status: 'queued', nextAttemptAt: { lte: now } }, { status: 'processing', leaseUntil: { lt: now } }] },
      orderBy: { createdAt: 'asc' }
    });
    if (!candidate) break;
    const token = randomUUID();
    const claim = await prisma.ownerNotification.updateMany({
      where: { id: candidate.id, status: candidate.status, leaseToken: candidate.leaseToken, updatedAt: candidate.updatedAt },
      data: { status: 'processing', leaseToken: token, leaseUntil: new Date(now.getTime() + LEASE_MS), attemptCount: { increment: 1 } }
    });
    if (!claim.count) continue;
    processed++;
    const finish = (data: Parameters<typeof prisma.ownerNotification.updateMany>[0]['data']) => prisma.ownerNotification.updateMany({
      where: { id: candidate.id, leaseToken: token, status: 'processing' },
      data: { ...data, leaseToken: null, leaseUntil: null }
    });
    try {
      const preferences = await getNotificationPreferences(candidate.accountId);
      const recipient = await ownerNotificationRecipient(candidate.accountId, preferences);
      if (!preferences.enabled || !recipient) { await finish({ status: 'skipped', lastError: !preferences.enabled ? 'notifications_disabled' : 'owner_recipient_unavailable' }); continue; }
      const suppressed = await prisma.ownerNotification.findFirst({ where: { accountId: candidate.accountId, recipient, status: { in: ['bounced', 'complained'] } }, select: { id: true } });
      if (suppressed) { await finish({ status: 'skipped', lastError: 'recipient_suppressed' }); continue; }
      if (candidate.firstAttemptAt && candidate.recipient !== recipient) { await finish({ status: 'skipped', lastError: 'recipient_changed_after_attempt' }); continue; }
      if (candidate.firstAttemptAt && !canRetryDelivery(candidate.firstAttemptAt, candidate.attemptCount, now)) { await finish({ status: 'needs_review', lastError: 'safe_retry_window_exhausted' }); continue; }

      let payload = candidate.payloadJson ? emailPayloadSchema.parse(JSON.parse(candidate.payloadJson)) : null;
      if (!payload || !candidate.firstAttemptAt) {
        const quote = await prisma.quoteRequest.findFirst({ where: { id: candidate.quoteRequestId, accountId: candidate.accountId }, include: { account: { select: { name: true } }, request: { select: { notificationAudience: true, Results: { where: { accountId: candidate.accountId }, orderBy: { variant: 'asc' }, select: { imageUrl: true, status: true } } } } } });
        if (!quote || (quote.request && quote.request.notificationAudience !== 'customer')) { await finish({ status: 'skipped', lastError: 'customer_quote_unavailable' }); continue; }
        payload = buildOwnerNotificationEmail({ from: sender, recipient, storeName: quote.account.name, quoteId: quote.id, productType: quote.productType ?? "general_quote",
          customerName: quote.customerName, customerPhone: quote.customerPhone, customerEmail: quote.customerEmail,
          designText: quote.text ?? "", imageUrl: quote.designedImageUrl, ...notificationImages(quote), notes: quote.quoteNotes, kind: candidate.kind, baseUrl,
          styleId: quote.styleId, pendantFinish: quote.pendantFinish, twoTone: quote.twoTone,
          primaryMetal: quote.primaryMetal, secondaryMetal: quote.secondaryMetal, emblem: quote.emblem,
          size: quote.size, metalType: quote.metalType, stoneType: quote.stoneType,
          plainMetal: quote.plainMetal, plainKarat: quote.plainKarat, plainChain: quote.plainChain,
          plainColor: quote.plainColor, diamondQuality: quote.diamondQuality,
          budgetMinCents: quote.budgetMinCents, budgetMaxCents: quote.budgetMaxCents,
          createdAt: quote.createdAt, status: quote.status });
      }
      // Freeze all fields before sending. A worker crash safely reuses this body.
      const firstAttemptAt = candidate.firstAttemptAt ?? now;
      const attempts = candidate.attemptCount + 1;
      const frozen = await prisma.ownerNotification.updateMany({ where: { id: candidate.id, leaseToken: token, status: 'processing' }, data: { payloadJson: JSON.stringify(payload), recipient, firstAttemptAt, attemptCount: attempts } });
      if (!frozen.count) continue;
      // Recheck immediately before the network call, including preference changes.
      const current = await getNotificationPreferences(candidate.accountId);
      const currentRecipient = await ownerNotificationRecipient(candidate.accountId, current);
      if (!current.enabled || currentRecipient !== recipient) { await finish({ status: 'skipped', lastError: 'preference_changed_before_send' }); continue; }
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': candidate.id },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(20_000)
      });
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500 || response.status === 408 || response.status === 409;
        const errorBody = await response.json().catch(() => ({}));
        const permanentConflict = errorBody?.name === 'invalid_idempotent_request';
        if (!retryable || permanentConflict) { await finish({ status: 'failed', lastError: `resend_http_${response.status}` }); continue; }
        throw new Error(`resend_http_${response.status}`);
      }
      const body = await response.json();
      if (typeof body.id !== 'string' || !body.id) throw new Error('resend_response_missing_id');
      // Keep this write separate from error retries: accepted mail remains the
      // same idempotent request if database persistence temporarily fails.
      await finish({ status: 'sent', providerMessageId: body.id, sentAt: new Date(), lastError: null });
      await reconcileNotificationWebhooks();
    } catch (error) {
      // Avoid putting provider bodies or customer data in logs or error fields.
      const latest = await prisma.ownerNotification.findUnique({ where: { id: candidate.id } });
      const first = latest?.firstAttemptAt ?? candidate.firstAttemptAt;
      const attempts = latest?.attemptCount ?? candidate.attemptCount;
      const retry = first ? canRetryDelivery(first, attempts) : attempts < MAX_ATTEMPTS;
      const code = error instanceof Error && /^resend_[a-z0-9_]+$/.test(error.message) ? error.message : 'notification_processing_error';
      await finish({ status: retry ? 'queued' : 'needs_review', nextAttemptAt: new Date(Date.now() + Math.min(60_000 * 5 ** Math.max(attempts - 1, 0), 4 * 60 * 60_000)), lastError: code });
    }
    // Resend's default API rate limit is low; keep the sequential batch modest.
    if (index + 1 < limit) await new Promise(resolve => setTimeout(resolve, 600));
  }
  return { processed, configured: true };
}
