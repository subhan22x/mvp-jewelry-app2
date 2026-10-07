import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import GrillzBuilder from "../GrillzBuilder";

vi.mock("@/app/name/components/LeadCaptureModal", () => ({
  default: ({ onSubmitted }: { onSubmitted: (contact: { leadId: string; name: string; phone: string; email: string }) => void }) => (
    <button onClick={() => onSubmitted({ leadId: "lead", name: "Customer", phone: "+17135550123", email: "customer@example.com" })}>Save contact</button>
  )
}));
const json = (body: unknown) => ({ ok: true, json: async () => body });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function review() {
  const user = userEvent.setup();
  render(<GrillzBuilder />);
  await user.click(screen.getByRole("button", { name: "Honeycomb Icedout Honeycomb Icedout" }));
  await user.click(screen.getByRole("button", { name: "Lower 3" }));
  await user.click(screen.getByRole("button", { name: "White Gold" }));
  await user.click(screen.getByRole("button", { name: "Review" }));
  return user;
}

describe("grillz positioning preview", () => {
  it.each(["Luxury Silver", "Gold Silver", "Rose Gold", "Rainbow Gemstone", "Iced Diamond", "Gold Hearts"])("selects %s and shows its matching review preview", async label => {
    const user = userEvent.setup();
    render(<GrillzBuilder />);
    await user.click(screen.getByRole("button", { name: `${label} ${label}` }));
    expect(screen.getByRole("heading", { name: "Position" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.getByAltText(`${label} style reference`)).toBeInTheDocument();
  });

  it("sends the selected diamond quality and resets the generated draft when it changes", async () => {
    const fetchMock = vi.fn(async (url: string, _options?: RequestInit) => json(url === "/api/grillz-requests" ? { requestId: "quality" } : { results: [{ imageUrl: "/generated/grillz.png" }], done: true }));
    vi.stubGlobal("fetch", fetchMock);
    const user = await review();
    await user.click(screen.getByRole("button", { name: "VS" }));
    expect(screen.getByRole("button", { name: "VS" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByAltText("Generated Grillz");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body ?? "{}"))).toEqual(expect.objectContaining({ diamondQuality: "vs" }));
    await user.click(screen.getByRole("button", { name: "VVS" }));
    expect(screen.queryByAltText("Generated Grillz")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
  });

  it("requests a quote with captured contact and prevents repeat submissions after success", async () => {
    const fetchMock = vi.fn(async (url: string, _options?: RequestInit) => json(url === "/api/grillz-requests" ? { requestId: "quote" } : url === "/api/quote-requests" ? { quoteRequestId: "draft" } : { results: [{ imageUrl: "/generated/grillz.png" }], done: true }));
    vi.stubGlobal("fetch", fetchMock);
    const user = await review();
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByAltText("Generated Grillz");
    expect(screen.getByRole("button", { name: "get a quote" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Save contact" }));
    await user.click(screen.getByRole("button", { name: "get a quote" }));
    expect(await screen.findByRole("button", { name: "Quote requested" })).toBeDisabled();
    const quoteCall = fetchMock.mock.calls.find(([url]) => url === "/api/quote-requests");
    expect(JSON.parse(String(quoteCall?.[1]?.body))).toEqual({ requestId: "quote", diamondQuality: "vvs", customerName: "Customer", customerPhone: "+17135550123", customerEmail: "customer@example.com" });
    expect(screen.getByRole("status")).toHaveTextContent("ready for the store to prepare a quote");
    await user.click(screen.getByRole("button", { name: "edit" }));
    await user.click(screen.getByRole("button", { name: "Lower 8" }));
    await user.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a failed quote request and allows retry", async () => {
    let quotes = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url === "/api/quote-requests" && ++quotes === 1) return { ok: false, json: async () => ({ error: "Please retry." }) };
      return json(url === "/api/grillz-requests" ? { requestId: "quote" } : url === "/api/quote-requests" ? { quoteRequestId: "draft" } : { results: [{ imageUrl: "/generated/grillz.png" }], done: true });
    }));
    const user = await review();
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByAltText("Generated Grillz");
    await user.click(screen.getByRole("button", { name: "Save contact" }));
    await user.click(screen.getByRole("button", { name: "get a quote" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please retry.");
    await user.click(screen.getByRole("button", { name: "get a quote" }));
    expect(await screen.findByRole("button", { name: "Quote requested" })).toBeDisabled();
    expect(quotes).toBe(2);
  });

  it("keeps exact coverage visible after generation and invalidates a draft after editing", async () => {
    const fetchMock = vi.fn(async (url: string, _options?: RequestInit) => json(url === "/api/grillz-requests"
      ? { requestId: "preview" }
      : { results: [{ imageUrl: "/generated/grillz.png" }], done: true }));
    vi.stubGlobal("fetch", fetchMock);
    const user = await review();
    const name = "Grillz positioning in white gold: Upper 4, Upper 5, Upper 6, Upper 7, Lower 3";
    expect(screen.getByRole("img", { name })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lower 3" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByAltText("Generated Grillz");
    expect(screen.getByRole("img", { name })).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body ?? "{}"))).toEqual(expect.objectContaining({ selectedTeeth: ["L3", "U4", "U5", "U6", "U7"], goldColor: "white_gold" }));
    await user.click(screen.getByRole("button", { name: "edit" }));
    expect(screen.getByRole("button", { name: "Lower 3" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Rose Gold" }));
    await user.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.queryByAltText("Generated Grillz")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: name.replace("white gold", "rose gold") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
  });

  it("ignores a late poll response when positioning changed during generation", async () => {
    let resolvePoll!: (value: ReturnType<typeof json>) => void;
    const poll = new Promise<ReturnType<typeof json>>(resolve => { resolvePoll = resolve; });
    const fetchMock = vi.fn((url: string) => url === "/api/grillz-requests" ? Promise.resolve(json({ requestId: "pending" })) : poll);
    vi.stubGlobal("fetch", fetchMock);
    const user = await review();
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("img", { name: /Grillz positioning/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "edit" }));
    await user.click(screen.getByRole("button", { name: "Lower 8" }));
    resolvePoll(json({ results: [{ imageUrl: "/generated/stale.png" }], done: true }));
    await user.click(screen.getByRole("button", { name: "Review" }));
    expect(screen.queryByAltText("Generated Grillz")).not.toBeInTheDocument();
    expect(screen.getByText("4 upper · 2 lower")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate" })).toBeEnabled();
  });
});
