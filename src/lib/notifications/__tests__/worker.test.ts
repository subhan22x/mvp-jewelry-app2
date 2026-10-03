import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), unique: vi.fn(), events: vi.fn(), quote: vi.fn(), preferences: vi.fn(), recipient: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { $queryRaw: mock.events, ownerNotification: { findFirst: mock.find, updateMany: mock.update, findUnique: mock.unique }, quoteRequest: { findFirst: mock.quote } } }));
vi.mock("../preferences", () => ({ getNotificationPreferences: mock.preferences, ownerNotificationRecipient: mock.recipient }));
import { canRetryDelivery, notificationWorkerAuthorized, processOwnerNotifications, RETRY_WINDOW_MS } from "../worker";

const candidate = { id: "event-1", accountId: "account-1", quoteRequestId: "quote-1", status: "queued", leaseToken: null, updatedAt: new Date(), kind: "generated_design", firstAttemptAt: null, attemptCount: 0, payloadJson: null, recipient: null };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("RESEND_API_KEY", "test-key"); vi.stubEnv("NOTIFICATION_EMAIL_FROM", "Grow Jewelry <alerts@example.com>"); vi.stubEnv("APP_BASE_URL", "https://growjewelry.io");
  mock.events.mockResolvedValue([]); mock.find.mockResolvedValueOnce(candidate).mockResolvedValue(null); mock.update.mockResolvedValue({ count: 1 });
  mock.preferences.mockResolvedValue({ enabled: true, emailOverride: null }); mock.recipient.mockResolvedValue("owner@example.com");
  mock.quote.mockResolvedValue({ id: "quote-1", account: { name: "Store" }, request: { notificationAudience: "customer" }, productType: "name", customerName: "Ava", customerPhone: "555-1234", customerEmail: "ava@example.com", text: "AVA", designedImageUrl: "/generated/ava.png" });
  mock.unique.mockResolvedValue({ ...candidate, firstAttemptAt: new Date(), attemptCount: 1 });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "provider-1" }) }));
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("notification worker safety", () => {
  it("leaves due rows untouched when insufficient batch time remains", async () => {
    expect(await processOwnerNotifications(5, 30_000)).toEqual({ processed: 0, configured: true });
    expect(mock.find).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("stops claiming after a slow delivery consumes the batch time budget", async () => {
    vi.useFakeTimers();
    const start = Date.now();
    const now = vi.spyOn(Date, "now").mockReturnValue(start);
    vi.mocked(fetch).mockImplementation(async () => {
      now.mockReturnValue(start + 125_000);
      return { ok: true, json: async () => ({ id: "provider-1" }) } as Response;
    });
    const task = processOwnerNotifications(5);
    await vi.runAllTimersAsync();
    expect(await task).toEqual({ processed: 1, configured: true });
    // One due-row search, one Account suppression search; no second due-row claim.
    expect(mock.find).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("uses the Account timezone in the payload sent to Resend", async () => {
    mock.preferences.mockResolvedValue({ enabled: true, emailOverride: null, timeZone: "America/Chicago" });
    const quote = await mock.quote();
    mock.quote.mockResolvedValue({ ...quote, createdAt: new Date("2026-10-03T07:38:00Z") });
    await processOwnerNotifications(1);
    const payload = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(payload.html).toContain("2:38 AM CDT");
    expect(payload.text).toContain("Submitted (CDT)");
    expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ payloadJson: JSON.stringify(payload) }) }));
  });
  it("records provider acceptance and uses a persisted unique idempotency key", async () => {
    expect(await processOwnerNotifications(1)).toEqual({ processed: 1, configured: true });
    expect(fetch).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ headers: expect.objectContaining({ "Idempotency-Key": "event-1" }) }));
    expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "sent", providerMessageId: "provider-1" }) }));
    expect(mock.quote).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "quote-1", accountId: "account-1" } }));
  });
  it("does not call Resend when the owner disables notifications", async () => {
    mock.preferences.mockResolvedValue({ enabled: false });
    await processOwnerNotifications(1);
    expect(fetch).not.toHaveBeenCalled();
    expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "skipped" }) }));
  });
  it("rechecks preference changes immediately before sending", async () => {
    mock.preferences.mockResolvedValueOnce({ enabled: true }).mockResolvedValueOnce({ enabled: false });
    await processOwnerNotifications(1);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("excludes dashboard owner work even if accidentally queued", async () => {
    mock.quote.mockResolvedValue({ request: { notificationAudience: "owner" } });
    await processOwnerNotifications(1);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("queues transient provider failures without marking delivery successful", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 429, json: async () => ({}) } as Response);
    await processOwnerNotifications(1);
    expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "queued", lastError: "resend_http_429" }) }));
  });
  it("preserves the exact payload across retries and stops if the recipient changes", async () => {
    const payload = { from: "Original <alerts@example.com>", to: ["owner@example.com"], subject: "Original subject", html: "Original HTML", text: "Original text" };
    mock.find.mockReset().mockResolvedValueOnce({ ...candidate, firstAttemptAt: new Date(), attemptCount: 1, recipient: "owner@example.com", payloadJson: JSON.stringify(payload) }).mockResolvedValue(null);
    await processOwnerNotifications(1);
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual(payload);
    vi.mocked(fetch).mockClear();
    mock.find.mockResolvedValueOnce({ ...candidate, firstAttemptAt: new Date(), recipient: "old@example.com" });
    await processOwnerNotifications(1);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not reclaim a row another worker has claimed", async () => {
    mock.update.mockResolvedValue({ count: 0 });
    await processOwnerNotifications(1);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("requires real provider configuration and worker authentication", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect(await processOwnerNotifications(1)).toEqual({ processed: 0, configured: false, configurationError: "resend_api_key_missing" });
    expect(mock.find).not.toHaveBeenCalled();
    vi.stubEnv("NOTIFICATION_WORKER_SECRET", "test-worker-secret");
    expect(notificationWorkerAuthorized(new Request("https://example.com"))).toBe(false);
    expect(notificationWorkerAuthorized(new Request("https://example.com", { headers: { authorization: "Bearer test-worker-secret" } }))).toBe(true);
  });
  it("reports a missing verified sender without claiming delivery", async () => {
    vi.stubEnv("NOTIFICATION_EMAIL_FROM", "");
    expect(await processOwnerNotifications(1)).toEqual({ processed: 0, configured: false, configurationError: "notification_email_from_missing" });
    expect(mock.find).not.toHaveBeenCalled();
  });
  it("reports a missing trusted application URL without claiming delivery", async () => {
    vi.stubEnv("APP_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(await processOwnerNotifications(1)).toEqual({ processed: 0, configured: false, configurationError: "notification_base_url_missing" });
    expect(mock.find).not.toHaveBeenCalled();
  });
  it("suppresses a bounced recipient only within the current Account", async () => {
    await processOwnerNotifications(1);
    expect(mock.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ accountId: "account-1", recipient: "owner@example.com" }) }));
  });
  it("stops automatic retry before Resend's 24-hour deduplication window expires", () => {
    const now = new Date();
    expect(canRetryDelivery(new Date(now.getTime() - RETRY_WINDOW_MS - 1), 1, now)).toBe(false);
    expect(canRetryDelivery(now, 6, now)).toBe(false);
    expect(canRetryDelivery(now, 1, now)).toBe(true);
  });
});
