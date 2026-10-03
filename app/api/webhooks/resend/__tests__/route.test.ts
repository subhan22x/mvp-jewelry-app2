import { createHmac } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ save: vi.fn(), reconcile: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { notificationWebhookEvent: { upsert: mocks.save } } }));
vi.mock("@/src/lib/notifications/worker", () => ({ reconcileNotificationWebhooks: mocks.reconcile }));
import { POST } from "../route";
const secret = Buffer.from("test-notifications-signing-secret");
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("RESEND_WEBHOOK_SECRET", `whsec_${secret.toString('base64')}`); });
afterEach(() => vi.unstubAllEnvs());
function request(alter = false) {
  const body = JSON.stringify({ type: "email.delivered", created_at: new Date().toISOString(), data: { email_id: "provider-1" } });
  const id = "msg_event_1", timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret).update(`${id}.${timestamp}.${body}`).digest('base64');
  return new Request("https://example.com/api/webhooks/resend", { method: "POST", headers: { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature}` }, body: alter ? body.replace('email.delivered', 'email.bounced') : body });
}
describe("signed Resend webhook", () => {
  it("persists and deduplicates verified events before reconciliation", async () => {
    expect((await POST(request())).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "msg_event_1" }, update: {}, create: expect.objectContaining({ providerMessageId: "provider-1", type: "email.delivered" }) }));
    expect(mocks.reconcile).toHaveBeenCalledOnce();
  });
  it("rejects tampered or unsigned events without persisting", async () => {
    expect((await POST(request(true))).status).toBe(400);
    expect((await POST(new Request("https://example.com", { method: "POST", body: '{}' }))).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
