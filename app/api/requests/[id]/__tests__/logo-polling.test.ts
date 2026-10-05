import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ find: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { request: { findUnique: mocks.find } } }));
import { GET } from "../route";

describe("logo results polling", () => {
  it.each([
    ["succeeded", "pending", false],
    ["failed", "pending", false],
    ["succeeded", "failed", true],
    ["succeeded", "succeeded", true],
    ["failed", "failed", true]
  ])("waits for both logo variants (%s, %s)", async (first, second, done) => {
    mocks.find.mockResolvedValue({ id: "logo-request", productType: "logo", Results: [first, second].map((status, index) => ({ id: `result-${index}`, variant: index + 1, status, imageUrl: status === "succeeded" ? `/generated/logo-${index}.png` : null, durationMs: null })) });
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "logo-request" }) });
    const data = await response.json();
    expect(data.generation.total).toBe(2);
    expect(data.done).toBe(done);
    expect(data.results).toHaveLength([first, second].filter(status => status === "succeeded").length);
  });

  it.each(["succeeded", "failed", "pending"])("handles a single %s logo attempt", async status => {
    mocks.find.mockResolvedValue({ id: "logo-request", productType: "logo", Results: [{ id: "result", variant: 1, status, imageUrl: status === "succeeded" ? "/generated/logo.png" : null, durationMs: null }] });
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "logo-request" }) });
    const data = await response.json();
    expect(data.generation.total).toBe(1);
    expect(data.done).toBe(status !== "pending");
    expect(data.results).toHaveLength(status === "succeeded" ? 1 : 0);
  });
});
