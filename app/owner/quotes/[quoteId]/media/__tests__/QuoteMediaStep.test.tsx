import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QuoteMediaStep from "../QuoteMediaStep";
const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const props = { canUsePaidFeatures: true, quoteId: "quote-1", title: "Test", imageUrl: null, canGenerate3d: true, canGenerateVideo: true, initialMediaType: "model3d" as const, initialModelJob: { id: "model-1", status: "succeeded", error: null }, initialVideoJob: null };
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("fetch", vi.fn()); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("quote media billing and publishing", () => {
  it("does not publish a completed asset when billing blocks access", async () => {
    render(<QuoteMediaStep {...props} canUsePaidFeatures={false} />);
    await act(async () => {});
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Open quote preview" })).toBeDisabled();
  });
  it("does not poll unfinished jobs behind the billing overlay", async () => {
    vi.useFakeTimers();
    render(<QuoteMediaStep {...props} canUsePaidFeatures={false} initialModelJob={{ id: "model-1", status: "processing", error: null }} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("stops auto-publish after a rejection and explicitly retries the existing asset", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ error: "Billing required" }), { status: 402 })).mockResolvedValueOnce(new Response("{}"));
    const view = render(<QuoteMediaStep {...props} />);
    await screen.findByText("Billing required");
    expect(fetch).toHaveBeenCalledTimes(1);
    view.rerender(<QuoteMediaStep {...props} />);
    await act(async () => {});
    expect(fetch).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Open quote preview" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/owner/quotes/quote-1/preview"));
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [url, options] of vi.mocked(fetch).mock.calls) { expect(url).toBe("/api/quote-requests/quote-1"); expect(options?.method).toBe("PATCH"); }
  });
  it("still automatically opens a completed preview for entitled owners", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}"));
    render(<QuoteMediaStep {...props} />);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/owner/quotes/quote-1/preview"));
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
