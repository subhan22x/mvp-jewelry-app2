import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LogoPendantBuilder from "../LogoPendantBuilder";

const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@/src/lib/uploads/direct-r2", () => ({ uploadFileDirectly: async () => null }));
vi.mock("@/app/name/components/LeadCaptureModal", () => ({ default: ({ onSubmitted }: { onSubmitted: (lead: { leadId: string; name: string; phone: string; email: string }) => void }) => (
  <div role="dialog" aria-label="Contact loading screen"><button onClick={() => onSubmitted({ leadId: "lead", name: "Ava", phone: "5551234567", email: "ava@example.com" })}>Submit contact</button></div>
) }));

const json = (body: unknown, ok = true) => ({ ok, json: async () => body });
const original = { id: "original-result", variant: 1, imageUrl: "/generated/logo.png" };

async function generate() {
  const user = userEvent.setup();
  render(<LogoPendantBuilder accountSlug="store" />);
  await user.upload(screen.getByLabelText("Upload logo image"), new File(["image"], "logo.png", { type: "image/png" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(screen.getByRole("button", { name: "Generate" }));
  await screen.findByRole("dialog", { name: "Contact loading screen" });
  return user;
}

describe("logo loading and iced-out results flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    vi.stubGlobal("URL", class extends URL { static createObjectURL = () => "blob:logo"; static revokeObjectURL = vi.fn(); });
    mocks.fetch.mockImplementation(async url => String(url).endsWith("/api/logo-requests") ? json({ requestId: "request" }) : json({ done: true, results: [original] }));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("starts with Additional info enabled and sends brand context", async () => {
    const user = userEvent.setup();
    render(<LogoPendantBuilder accountSlug="store" />);
    expect(screen.getByRole("button", { name: "Toggle additional info" })).toHaveAttribute("aria-pressed", "true");
    await user.type(screen.getByRole("textbox", { name: "Additional info" }), "We move inventory");
    await user.upload(screen.getByLabelText("Upload logo image"), new File(["image"], "logo.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("We move inventory")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByRole("dialog", { name: "Contact loading screen" });
    const post = mocks.fetch.mock.calls.find(([url]) => url === "/api/logo-requests");
    expect(post?.[1].body.get("additionalText")).toBe("We move inventory");
  });

  it("does not send disabled brand context", async () => {
    const user = userEvent.setup();
    render(<LogoPendantBuilder />);
    await user.type(screen.getByRole("textbox", { name: "Additional info" }), "Hidden info");
    await user.click(screen.getByRole("button", { name: "Toggle additional info" }));
    await user.upload(screen.getByLabelText("Upload logo image"), new File(["image"], "logo.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.queryByText("Hidden info")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Generate" }));
    await screen.findByRole("dialog", { name: "Contact loading screen" });
    const post = mocks.fetch.mock.calls.find(([url]) => url === "/api/logo-requests");
    expect(post?.[1].body.get("additionalText")).toBe("");
  });

  it("shows Flash progressively while Pro is pending and allows selecting it", async () => {
    mocks.fetch.mockImplementation(async url => String(url).endsWith("/api/logo-requests") ? json({ requestId: "request" }) : json({
      done: false,
      results: [{ ...original, id: "flash-result", variant: 2 }],
      attempts: [
        { id: "pro-result", variant: 1, status: "pending", imageUrl: null },
        { id: "flash-result", variant: 2, status: "succeeded", imageUrl: original.imageUrl }
      ]
    }));
    const user = await generate();
    await user.click(screen.getByRole("button", { name: "Submit contact" }));
    expect(await screen.findByText("1 of 2 generated")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Logo pendant draft 1" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Logo pendant draft 2" }));
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
  });

  it("keeps loading/contact separate from results even when generation finishes first", async () => {
    const user = await generate();
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledWith("/api/requests/request"));
    expect(document.querySelector("main")).toBeNull();
    expect(screen.queryByText("Choose your favourite")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit contact" }));
    expect(await screen.findByText("Choose your favourite")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Contact loading screen" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Logo pendant draft 1" }));
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Preview Logo pendant draft 1" }));
    const preview = screen.getByRole("dialog", { name: "Logo pendant draft 1 preview" });
    expect(within(preview).getByRole("link", { name: "Download" })).toHaveAttribute("href", original.imageUrl);
    await user.click(within(preview).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uses original result IDs for image revisions, displays revision cards, and enforces the two-revision limit", async () => {
    let revisionCount = 0;
    mocks.fetch.mockImplementation(async (url, options) => {
      if (url === "/api/logo-requests") return json({ requestId: "request" });
      if (url === "/api/requests/request") return json({ done: true, results: [original] });
      if (options?.method === "POST") {
        expect(JSON.parse(options.body).sourceResultId).toBe(original.id);
        revisionCount += 1;
        return json({ revisionId: `revision-${revisionCount}`, revisionNumber: revisionCount });
      }
      return json({ done: true, status: "succeeded", imageUrl: `/generated/rev-${revisionCount}.png` });
    });
    const user = await generate();
    await user.click(screen.getByRole("button", { name: "Submit contact" }));
    await screen.findByRole("button", { name: "Edit Logo pendant draft 1" });
    for (const label of ["Logo pendant draft 1", "Rev 1"]) {
      await user.click(screen.getByRole("button", { name: `Edit ${label}` }));
      await user.type(screen.getByLabelText("Revision notes"), "Make the logo larger");
      await user.click(screen.getByRole("button", { name: "create revision" }));
      await screen.findByText(new RegExp(`Rev ${revisionCount} selected`));
    }
    expect(screen.getByText(/2 of 2 revisions used/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Logo pendant draft 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rev 2" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows revision submission errors without using a revision slot", async () => {
    const user = await generate();
    await user.click(screen.getByRole("button", { name: "Submit contact" }));
    await user.click(await screen.findByRole("button", { name: "Edit Logo pendant draft 1" }));
    await user.type(screen.getByLabelText("Revision notes"), "Make the border thinner");
    mocks.fetch.mockResolvedValueOnce(json({ error: "Monthly usage limit reached." }, false));
    await user.click(screen.getByRole("button", { name: "create revision" }));
    expect(await screen.findByText("Monthly usage limit reached.")).toBeInTheDocument();
    expect(screen.getByText(/0 of 2 revisions used/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit Logo pendant draft 1" })).toBeInTheDocument();
  });
});
