import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ authorized: vi.fn(), process: vi.fn() }));
vi.mock("@/src/lib/notifications/worker", () => ({ notificationWorkerAuthorized: mock.authorized, processOwnerNotifications: mock.process }));
import { GET, POST } from "../route";

beforeEach(() => { vi.clearAllMocks(); mock.authorized.mockReturnValue(true); mock.process.mockResolvedValue({ configured: true, processed: 0 }); });
const request = (body?: string, method = "POST") => new Request("https://example.com/api/internal/notifications/process", { method, ...(body === undefined ? {} : { body }) });

describe("notification processing route", () => {
  it("rejects unauthorized requests before reading input or invoking the worker", async () => {
    mock.authorized.mockReturnValue(false);
    expect((await POST(request("invalid"))).status).toBe(401);
    expect(mock.process).not.toHaveBeenCalled();
  });
  it.each([1, 5])("passes a bounded batch limit %s", async limit => {
    expect((await POST(request(JSON.stringify({ limit })))).status).toBe(200);
    expect(mock.process).toHaveBeenCalledWith(limit);
  });
  it.each([undefined, "", "{}"])("keeps the default for an omitted limit (%s)", async body => {
    await POST(request(body)); expect(mock.process).toHaveBeenCalledWith(undefined);
  });
  it("preserves the GET caller", async () => { await GET(request(undefined, "GET")); expect(mock.process).toHaveBeenCalledWith(undefined); });
  it.each(["oops", "null", "[]", '{"limit":0}', '{"limit":6}', '{"limit":1.5}', '{"limit":"5"}', '{"limit":5,"accountId":"other"}', " ".repeat(101)])("rejects invalid input: %s", async body => {
    expect((await POST(request(body))).status).toBe(400); expect(mock.process).not.toHaveBeenCalled();
  });
  it("preserves explicit configuration failure for scheduler detection", async () => {
    mock.process.mockResolvedValue({ configured: false, processed: 0, configurationError: "resend_api_key_missing" });
    expect(await (await POST(request())).json()).toEqual({ configured: false, processed: 0, configurationError: "resend_api_key_missing" });
  });
});
