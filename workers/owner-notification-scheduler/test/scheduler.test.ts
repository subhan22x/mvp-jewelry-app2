import { createExecutionContext, createScheduledController, waitOnExecutionContext } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker, { runNotificationSchedule, REQUEST_TIMEOUT_MS, type SchedulerEnv } from "../src/index";
import configText from "../wrangler.jsonc?raw";
const config = JSON.parse(configText);

const env: SchedulerEnv = {
  NOTIFICATION_PROCESS_URL: "https://growjewelry.io/api/internal/notifications/process",
  NOTIFICATION_PROCESS_ORIGIN: "https://growjewelry.io",
  NOTIFICATION_WORKER_SECRET: "test-only-secret"
};
const log = vi.fn();
const error = vi.fn();
beforeEach(() => {
  log.mockClear(); error.mockClear();
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("console", { ...console, log, error });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const reply = (status: number, body: string) => vi.mocked(fetch).mockResolvedValue(new Response(body, { status }));

describe("notification recovery scheduler in Workers runtime", () => {
  it.each([0, 5])("awaits a real scheduled handler and accepts %s claimed items", async processed => {
    reply(200, JSON.stringify({ configured: true, processed }));
    const ctx = createExecutionContext();
    await worker.scheduled(createScheduledController({ scheduledTime: 1234, cron: "*/5 * * * *" }), env);
    await waitOnExecutionContext(ctx);
    expect(fetch).toHaveBeenCalledWith(env.NOTIFICATION_PROCESS_URL, expect.objectContaining({ method: "POST", redirect: "manual", body: '{"limit":5}', headers: { Authorization: "Bearer test-only-secret", "Content-Type": "application/json" } }));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"processed":' + processed));
  });
  it.each([301, 401, 403, 429, 500, 503])("fails visibly on HTTP %s without printing the response", async status => {
    reply(status, "customer-private@example.com test-only-secret");
    await expect(runNotificationSchedule(env, 1234)).rejects.toThrow(`processor_http_${status}`);
    expect(JSON.stringify(error.mock.calls)).not.toMatch(/customer-private|test-only-secret/);
  });
  it.each(["oops", "null", "[]", "{}", '{"configured":true,"processed":-1}', '{"configured":true,"processed":6}', '{"configured":true,"processed":1.5}', '{"configured":true,"processed":"1"}', "x".repeat(4097)])("rejects malformed or oversized success responses", async body => {
    reply(200, body);
    await expect(runNotificationSchedule(env, 1234)).rejects.toThrow("processor_response_invalid");
  });
  it("treats HTTP 200 with missing configuration as failure", async () => {
    reply(200, '{"configured":false,"processed":0,"configurationError":"resend_api_key_missing"}');
    await expect(runNotificationSchedule(env, 1234)).rejects.toThrow("processor_not_configured");
  });
  it.each(["", "http://growjewelry.io/api/internal/notifications/process", "https://evil.example/api/internal/notifications/process", "https://secret@growjewelry.io/api/internal/notifications/process", "https://growjewelry.io/wrong", env.NOTIFICATION_PROCESS_URL + "?x=1", env.NOTIFICATION_PROCESS_URL + "#x"]) ("rejects invalid destinations before networking", async url => {
    await expect(runNotificationSchedule({ ...env, NOTIFICATION_PROCESS_URL: url }, 1234)).rejects.toThrow("scheduler_url_invalid");
  });
  it("requires the dedicated secret", async () => {
    await expect(runNotificationSchedule({ ...env, NOTIFICATION_WORKER_SECRET: "" }, 1234)).rejects.toThrow("scheduler_secret_missing");
  });
  it("bounds the network call, rejects redirects, sanitizes errors, and never retries inline", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("test-only-secret customer-private@example.com"));
    vi.stubGlobal("fetch", fetch);
    await expect(runNotificationSchedule(env, 1234)).rejects.toThrow("processor_network_or_timeout");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1]).toMatchObject({ redirect: "manual" });
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(REQUEST_TIMEOUT_MS).toBe(180_000);
    expect(JSON.stringify(error.mock.calls)).not.toMatch(/test-only-secret|customer-private/);
  });
  it("has no public handler, isolates production cron, and disables public URLs", () => {
    expect(worker).not.toHaveProperty("fetch");
    expect(config.workers_dev).toBe(false); expect(config.preview_urls).toBe(false);
    expect(config.triggers.crons).toEqual([]);
    expect(config.env.production.triggers.crons).toEqual(["*/5 * * * *"]);
  });
});
