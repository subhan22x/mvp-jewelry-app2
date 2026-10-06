import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import GrillzBuilder from "../GrillzBuilder";

vi.mock("@/app/name/components/LeadCaptureModal", () => ({ default: () => null }));
const json = (body: unknown) => ({ ok: true, json: async () => body });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function review() {
  const user = userEvent.setup();
  render(<GrillzBuilder />);
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("button", { name: "Lower 3" }));
  await user.click(screen.getByRole("button", { name: "White Gold" }));
  await user.click(screen.getByRole("button", { name: "Review" }));
  return user;
}

describe("grillz positioning preview", () => {
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
