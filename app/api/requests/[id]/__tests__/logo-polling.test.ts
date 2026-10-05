import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { request: { findUnique: mocks.find } } }));
import { GET } from "../route";

describe("logo results polling", () => {
  it.each(["succeeded", "failed", "pending"])("handles a single %s logo attempt", async status => {
    mocks.find.mockResolvedValue({ id: "logo-request", productType: "logo", Results: [{ id: "result", variant: 1, status, imageUrl: status === "succeeded" ? "/generated/logo.png" : null, durationMs: null }] });
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "logo-request" }) });
    const data = await response.json();
    expect(data.generation.total).toBe(1);
    expect(data.done).toBe(status !== "pending");
    expect(data.results).toHaveLength(status === "succeeded" ? 1 : 0);
  });
});
