import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import userEvent from "@testing-library/user-event";
import { vi, beforeEach, describe, it, expect } from "vitest";
import NameBuilder from "../page";

const mockPush = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush })
}));

// Stub PhoneInput so tests can interact with it as a plain input
vi.mock("react-international-phone", () => ({
  PhoneInput: ({ value, onChange, inputProps }: any) =>
    <input {...inputProps} type="tel" value={value} onChange={(e: any) => onChange(e.target.value)} placeholder="Phone number" />
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// POST returns requestId immediately; GET returns 2 results and done flag
const MOCK_RESULTS = [1, 2].map(v => ({
  variant: v,
  imageUrl: `/generated/req-test-v${v}.png`
}));

function mockPostSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ requestId: "req-test" })
  });
}

function mockGetSuccess(results = MOCK_RESULTS) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      id: "req-test",
      results,
      attempts: results.map(result => ({
        ...result,
        status: "succeeded",
        durationSeconds: 2.5
      })),
      done: results.length >= 2
    })
  });
}

function mockGetFailed(message = "Provider failed") {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      id: "req-test",
      results: [],
      attempts: [
        { variant: 1, status: "failed", error: message, durationSeconds: 1.25 },
        { variant: 2, status: "failed", error: message, durationSeconds: 1.5 }
      ],
      done: true
    })
  });
}

function mockLeadsSuccess() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ leadId: "lead-test" })
  });
}

function mockLeadsError(message = "Server error") {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: message })
  });
}

function mockPostError(message = "Gemini unavailable") {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    json: async () => ({ error: message })
  });
}

async function setup() {
  const user = userEvent.setup();
  await act(async () => { render(<NameBuilder />); });
  return { user };
}

async function tap(user: ReturnType<typeof userEvent.setup>, el: HTMLElement) {
  await act(async () => { await user.click(el); });
}

async function type(user: ReturnType<typeof userEvent.setup>, el: HTMLElement, text: string) {
  await act(async () => { await user.type(el, text); });
}

// Navigation helpers
async function toStep1(user: ReturnType<typeof userEvent.setup>, name = "Aurora") {
  await type(user, screen.getByPlaceholderText(/text on pendant/i), name);
  await tap(user, screen.getByRole("button", { name: /^next$/i }));
}

async function toStep2(user: ReturnType<typeof userEvent.setup>) {
  await toStep1(user);
  await tap(user, screen.getByRole("button", { name: /^next$/i }));
}

// Submits the lead capture modal that appears on entering step 4
async function submitLeadForm(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole("dialog", { name: /to continue/i });
  await type(user, screen.getByLabelText(/^name$/i), "Test User");
  await type(user, screen.getByPlaceholderText(/phone number/i), "5555551234");
  await type(user, screen.getByLabelText(/^email address$/i), "test@example.com");
  mockLeadsSuccess();
  await tap(user, screen.getByRole("button", { name: /^submit$/i }));
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
}

// Navigates to step 4 with all 2 images loaded
async function toStep4(user: ReturnType<typeof userEvent.setup>) {
  await toStep2(user);
  mockPostSuccess();
  mockGetSuccess(); // first immediate poll returns all 2 with done:true
  await tap(user, screen.getByRole("button", { name: /^accept$/i }));
  await submitLeadForm(user);
  await waitFor(() => expect(screen.getAllByRole("button", { name: /^draft \d$/i })).toHaveLength(2));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

// ---------------------------------------------------------------------------
describe("Step 0 — Name & Style", () => {
  it("next is disabled until primary name is entered", async () => {
    await setup();
    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
  });

  it("next enables after typing a name", async () => {
    const { user } = await setup();
    await type(user, screen.getByPlaceholderText(/text on pendant/i), "Aurora");
    expect(screen.getByRole("button", { name: /^next$/i })).toBeEnabled();
  });

  it("whitespace-only input keeps next disabled", async () => {
    const { user } = await setup();
    await type(user, screen.getByPlaceholderText(/text on pendant/i), "   ");
    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
  });

  it("clearing the name re-disables next", async () => {
    const { user } = await setup();
    const input = screen.getByPlaceholderText(/text on pendant/i);
    await type(user, input, "Aurora");
    await act(async () => { await user.clear(input); });
    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
  });

  it("adds a second line and hides the add button at max (2)", async () => {
    const { user } = await setup();
    await tap(user, screen.getByLabelText(/add another line/i));
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.queryByLabelText(/add another line/i)).not.toBeInTheDocument();
  });

  it("minus button removes the second line", async () => {
    const { user } = await setup();
    await tap(user, screen.getByLabelText(/add another line/i));
    await tap(user, screen.getByLabelText(/remove name line/i));
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("uppercase button converts all lines and reflects pressed state", async () => {
    const { user } = await setup();
    const primary = screen.getByPlaceholderText(/text on pendant/i);
    await type(user, primary, "aurora");
    await tap(user, screen.getByLabelText(/add another line/i));
    const [, second] = screen.getAllByRole("textbox");
    await type(user, second, "belle");

    const uppBtn = screen.getByRole("button", { name: /convert all text to uppercase/i });
    expect(uppBtn).toHaveAttribute("aria-pressed", "false");
    await tap(user, uppBtn);

    const [first2, second2] = screen.getAllByRole("textbox") as HTMLInputElement[];
    expect(first2.value).toBe("AURORA");
    expect(second2.value).toBe("BELLE");
    expect(uppBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("typing after uppercase resets the pressed state", async () => {
    const { user } = await setup();
    const input = screen.getByPlaceholderText(/text on pendant/i);
    await type(user, input, "aurora");
    await tap(user, screen.getByRole("button", { name: /convert all text to uppercase/i }));
    await type(user, input, "x");
    expect(screen.getByRole("button", { name: /convert all text to uppercase/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("first style card is selected by default", async () => {
    await setup();
    const cards = screen.getAllByRole("button", { name: /pendant style/i });
    expect(cards[0]).toHaveAttribute("aria-pressed", "true");
    expect(cards.slice(1).every(c => c.getAttribute("aria-pressed") === "false")).toBe(true);
  });

  it("clicking another style card selects it and deselects the previous", async () => {
    const { user } = await setup();
    const cards = screen.getAllByRole("button", { name: /pendant style/i });
    await tap(user, cards[1]);
    expect(cards[0]).toHaveAttribute("aria-pressed", "false");
    expect(cards[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("back on step 0 calls router.push to home", async () => {
    const { user } = await setup();
    await tap(user, screen.getByRole("button", { name: /^back$/i }));
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("next advances to step 1", async () => {
    const { user } = await setup();
    await toStep1(user);
    expect(screen.getByLabelText(/toggle emblem/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe("Step 1 — Emblem & Gold", () => {
  it("emblem toggle is on by default", async () => {
    const { user } = await setup();
    await toStep1(user);
    expect(screen.getByLabelText(/toggle emblem/i)).toHaveAttribute("aria-pressed", "true");
  });

  it("toggling off disables picker interaction", async () => {
    const { user } = await setup();
    await toStep1(user);
    await tap(user, screen.getByLabelText(/toggle emblem/i));
    expect(screen.getByLabelText(/toggle emblem/i)).toHaveAttribute("aria-pressed", "false");
    await tap(user, screen.getByRole("button", { name: /heart/i }));
    expect(screen.getByRole("button", { name: /heart/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("selecting an emblem marks it pressed", async () => {
    const { user } = await setup();
    await toStep1(user);
    await tap(user, screen.getByRole("button", { name: /crown/i }));
    expect(screen.getByRole("button", { name: /crown/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("clicking a selected emblem deselects it", async () => {
    const { user } = await setup();
    await toStep1(user);
    await tap(user, screen.getByRole("button", { name: /crown/i }));
    await tap(user, screen.getByRole("button", { name: /crown/i }));
    expect(screen.getByRole("button", { name: /crown/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("emblem selection survives switching all gold combos", async () => {
    const { user } = await setup();
    await toStep1(user);
    await tap(user, screen.getByRole("button", { name: /heart/i }));
    for (const name of [/^yellow \+ white gold$/i, /^rose \+ white gold$/i, /^white gold$/i]) {
      await tap(user, screen.getByRole("button", { name }));
    }
    expect(screen.getByRole("button", { name: /heart/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("toggling emblem off then back on restores the previous selection", async () => {
    const { user } = await setup();
    await toStep1(user);
    await tap(user, screen.getByRole("button", { name: /butterfly/i }));
    const toggle = screen.getByLabelText(/toggle emblem/i);
    await tap(user, toggle);
    await tap(user, toggle);
    expect(screen.getByRole("button", { name: /butterfly/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("only one gold combo can be active at a time", async () => {
    const { user } = await setup();
    await toStep1(user);
    await tap(user, screen.getByRole("button", { name: /^rose \+ white gold$/i }));
    const activeGold = screen
      .getAllByRole("button")
      .filter(b =>
        [/yellow/i, /rose/i, /^white gold$/i].some(r => r.test(b.textContent ?? "")) &&
        b.getAttribute("aria-pressed") === "true"
      );
    expect(activeGold).toHaveLength(1);
    expect(activeGold[0]).toHaveTextContent(/rose \+ white gold/i);
  });

  it("back returns to step 0", async () => {
    const { user } = await setup();
    await toStep1(user);
    await tap(user, screen.getByRole("button", { name: /^back$/i }));
    expect(screen.getByPlaceholderText(/text on pendant/i)).toBeInTheDocument();
  });

  it("next advances to step 2", async () => {
    const { user } = await setup();
    await toStep1(user);
    await tap(user, screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByRole("button", { name: /^accept$/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe("Step 2 — Review", () => {
  it("shows entered name in summary", async () => {
    const { user } = await setup();
    await toStep2(user); // uses "Aurora"
    expect(screen.getByText("Aurora")).toBeInTheDocument();
  });

  it("diamond quality defaults to vvs with aria-pressed=true", async () => {
    const { user } = await setup();
    await toStep2(user);
    expect(screen.getByRole("button", { name: /^vvs$/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^vs$/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("can switch diamond quality to vs", async () => {
    const { user } = await setup();
    await toStep2(user);
    await tap(user, screen.getByRole("button", { name: /^vs$/i }));
    expect(screen.getByRole("button", { name: /^vs$/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^vvs$/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows 'None selected' when emblem toggle is on but nothing chosen", async () => {
    const { user } = await setup();
    await toStep2(user);
    expect(screen.getByText("None selected")).toBeInTheDocument();
  });

  it("shows 'Not included' when emblem is toggled off", async () => {
    const { user } = await setup();
    await toStep1(user);
    await tap(user, screen.getByLabelText(/toggle emblem/i));
    await tap(user, screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByText("Not included")).toBeInTheDocument();
  });

  it("shows selected emblem label in summary", async () => {
    const { user } = await setup();
    await toStep1(user);
    await tap(user, screen.getByRole("button", { name: /crown/i }));
    await tap(user, screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByText("Crown")).toBeInTheDocument();
  });

  it("edit button returns to step 0 preserving the entered name", async () => {
    const { user } = await setup();
    await toStep2(user);
    await tap(user, screen.getByRole("button", { name: /^edit$/i }));
    expect((screen.getByPlaceholderText(/text on pendant/i) as HTMLInputElement).value).toBe("Aurora");
  });

  it("accept button sends POST to /api/requests and transitions to step 4", async () => {
    const { user } = await setup();
    await toStep2(user);
    mockPostSuccess();
    mockGetSuccess();
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    await submitLeadForm(user);
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^draft \d$/i })).toHaveLength(2));
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/requests",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("shows error in step 2 when POST fails", async () => {
    const { user } = await setup();
    await toStep2(user);
    mockPostError("Gemini unavailable");
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    await waitFor(() => expect(screen.getByText(/gemini unavailable/i)).toBeInTheDocument());
    // Still on step 2 — accept button still present
    expect(screen.getByRole("button", { name: /^accept$/i })).toBeInTheDocument();
  });

  it("can retry after a POST error", async () => {
    const { user } = await setup();
    await toStep2(user);
    mockPostError();
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    await waitFor(() => screen.getByText(/gemini unavailable/i));
    mockPostSuccess();
    mockGetSuccess();
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    await submitLeadForm(user);
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^draft \d$/i })).toHaveLength(2));
    expect(mockFetch).toHaveBeenCalledTimes(4); // 2 × POST + 1 × GET + 1 × leads
  });
});

// ---------------------------------------------------------------------------
describe("Lead capture modal", () => {
  it("appears immediately when step 4 starts (before lead submit)", async () => {
    const { user } = await setup();
    await toStep2(user);
    mockPostSuccess();
    mockFetch.mockReturnValueOnce(new Promise(() => {})); // GET never resolves
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: /to continue/i })).toBeInTheDocument()
    );
  });

  it("does not close on overlay backdrop click", async () => {
    const { user } = await setup();
    await toStep2(user);
    mockPostSuccess();
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    const dialog = await screen.findByRole("dialog", { name: /to continue/i });
    await act(async () => { await user.click(dialog); });
    expect(dialog).toBeInTheDocument();
  });

  it("successful submit closes the modal", async () => {
    const { user } = await setup();
    await toStep2(user);
    mockPostSuccess();
    mockGetSuccess();
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    const dialog = await screen.findByRole("dialog", { name: /to continue/i });
    await type(user, screen.getByLabelText(/^name$/i), "Test User");
    await type(user, screen.getByPlaceholderText(/phone number/i), "5555551234");
    await type(user, screen.getByLabelText(/^email address$/i), "test@example.com");
    mockLeadsSuccess();
    await tap(user, screen.getByRole("button", { name: /^submit$/i }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  });

  it("server error keeps modal open with values intact", async () => {
    const { user } = await setup();
    await toStep2(user);
    mockPostSuccess();
    mockGetSuccess();
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    await screen.findByRole("dialog", { name: /to continue/i });
    await type(user, screen.getByLabelText(/^name$/i), "Test User");
    await type(user, screen.getByPlaceholderText(/phone number/i), "5555551234");
    await type(user, screen.getByLabelText(/^email address$/i), "test@example.com");
    mockLeadsError("Server error");
    await tap(user, screen.getByRole("button", { name: /^submit$/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("dialog", { name: /to continue/i })).toBeInTheDocument();
    expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe("Test User");
  });

  it("submit button is disabled while request is in flight", async () => {
    const { user } = await setup();
    await toStep2(user);
    mockPostSuccess();
    mockGetSuccess();
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    await screen.findByRole("dialog", { name: /to continue/i });
    await type(user, screen.getByLabelText(/^name$/i), "Test User");
    await type(user, screen.getByPlaceholderText(/phone number/i), "5555551234");
    await type(user, screen.getByLabelText(/^email address$/i), "test@example.com");
    // Leads POST never resolves
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /^submit$/i }));
    });
    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
  });

  it("modal closes when navigating back from step 4", async () => {
    const { user } = await setup();
    await toStep2(user);
    mockPostSuccess();
    mockFetch.mockReturnValueOnce(new Promise(() => {}));
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    await screen.findByRole("dialog", { name: /to continue/i });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await tap(user, screen.getAllByRole("button", { name: /^back$/i })[0]);
    expect(screen.queryByRole("dialog", { name: /to continue/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^accept$/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe("Step 4 — Progressive loading & Results", () => {
  it("shows skeletons for pending tiles immediately after accept", async () => {
    const { user } = await setup();
    await toStep2(user);
    // POST resolves, but GET never resolves — tiles should be skeletons
    mockPostSuccess();
    mockFetch.mockReturnValueOnce(new Promise(() => {})); // pending GET
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    await waitFor(() => expect(screen.getByText(/drafting your designs/i)).toBeInTheDocument());
    expect(screen.queryAllByRole("button", { name: /^draft \d$/i })).toHaveLength(0);
  });

  it("fills in tiles and shows all 2 when done", async () => {
    const { user } = await setup();
    await toStep4(user);
    expect(screen.getAllByRole("button", { name: /^draft \d$/i })).toHaveLength(2);
    expect(screen.queryByText(/drafting your designs/i)).not.toBeInTheDocument();
    expect(screen.getByText(/choose your favourite/i)).toBeInTheDocument();
  });

  it("first draft is auto-selected", async () => {
    const { user } = await setup();
    await toStep4(user);
    expect(screen.getByRole("button", { name: /^draft 1$/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows partial progress counter while loading", async () => {
    const { user } = await setup();
    await toStep2(user);
    mockPostSuccess();
    // GET returns only 1 of 2 (not done)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "req-test",
        results: MOCK_RESULTS.slice(0, 1),
        done: false
      })
    });
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    await waitFor(() => screen.getByText(/1 of 2 generated/i));
  });

  it("stops loading and shows an error when generation attempts finish without images", async () => {
    const { user } = await setup();
    await toStep2(user);
    mockPostSuccess();
    mockGetFailed("Provider failed after 1.25 seconds");
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    await submitLeadForm(user);
    await waitFor(() => expect(screen.queryByText(/drafting your designs/i)).not.toBeInTheDocument());
    expect(screen.getByText(/provider failed after 1\.25 seconds/i)).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /^draft \d$/i })).toHaveLength(0);
  });

  it("clicking a different tile selects it", async () => {
    const { user } = await setup();
    await toStep4(user);
    await tap(user, screen.getByRole("button", { name: /^draft 2$/i }));
    expect(screen.getByRole("button", { name: /^draft 1$/i })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /^draft 2$/i })).toHaveAttribute("aria-pressed", "true");
  });

  it("continue button is enabled when a draft is selected", async () => {
    const { user } = await setup();
    await toStep4(user);
    expect(screen.getByRole("button", { name: /^continue$/i })).toBeEnabled();
  });

  it("view button opens the preview modal", async () => {
    const { user } = await setup();
    await toStep4(user);
    await tap(user, screen.getAllByLabelText(/preview draft/i)[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("close button inside modal dismisses it", async () => {
    const { user } = await setup();
    await toStep4(user);
    await tap(user, screen.getAllByLabelText(/preview draft/i)[0]);
    await tap(user, screen.getByRole("button", { name: /^close$/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("× button dismisses the modal", async () => {
    const { user } = await setup();
    await toStep4(user);
    await tap(user, screen.getAllByLabelText(/preview draft/i)[0]);
    await tap(user, screen.getByLabelText(/close preview/i));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clicking modal backdrop closes it", async () => {
    const { user } = await setup();
    await toStep4(user);
    await tap(user, screen.getAllByLabelText(/preview draft/i)[0]);
    await act(async () => { await user.click(screen.getByRole("dialog")); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("download link points to correct image and has download attribute", async () => {
    const { user } = await setup();
    await toStep4(user);
    await tap(user, screen.getAllByLabelText(/preview draft/i)[0]);
    const link = screen.getByRole("link", { name: /download/i });
    expect(link).toHaveAttribute("href", "/generated/req-test-v1.png");
    expect(link).toHaveAttribute("download");
  });

  it("global back button shows confirm dialog when generations exist", async () => {
    const { user } = await setup();
    await toStep4(user);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    await tap(user, screen.getAllByRole("button", { name: /^back$/i })[0]);
    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByText(/choose your favourite/i)).toBeInTheDocument();
  });

  it("global back navigates to step 2 when confirmed", async () => {
    const { user } = await setup();
    await toStep4(user);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await tap(user, screen.getAllByRole("button", { name: /^back$/i })[0]);
    expect(screen.getByRole("button", { name: /^accept$/i })).toBeInTheDocument();
  });

  it("global back cancels in-flight polling so it cannot re-navigate to step 4", async () => {
    const { user } = await setup();
    await toStep2(user);
    mockPostSuccess();
    let resolveGet!: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise(r => { resolveGet = r; }));
    await tap(user, screen.getByRole("button", { name: /^accept$/i }));
    await waitFor(() => screen.getByText(/drafting your designs/i));

    // Navigate back before GET resolves
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await tap(user, screen.getAllByRole("button", { name: /^back$/i })[0]);
    expect(screen.getByRole("button", { name: /^accept$/i })).toBeInTheDocument();

    // Resolve the pending GET — must NOT jump us to step 4
    await act(async () => {
      resolveGet({ ok: true, json: async () => ({ id: "req-test", results: MOCK_RESULTS, done: true }) });
    });
    expect(screen.queryByText(/choose your favourite/i)).not.toBeInTheDocument();
  });

  it("inline back button also navigates to step 2", async () => {
    const { user } = await setup();
    await toStep4(user);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const backButtons = screen.getAllByRole("button", { name: /^back$/i });
    await tap(user, backButtons[backButtons.length - 1]);
    expect(screen.getByRole("button", { name: /^accept$/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
describe("Step indicator dots", () => {
  it("shows 4 dots (skips the transient step 3)", async () => {
    await setup();
    expect(document.querySelectorAll("footer span.rounded-full")).toHaveLength(4);
  });

  it("updates the active dot as the user navigates", async () => {
    const { user } = await setup();
    const activeDotIndex = () => {
      const dots = Array.from(document.querySelectorAll("footer span.rounded-full"));
      return dots.findIndex(d => d.classList.contains("bg-blue-400"));
    };
    expect(activeDotIndex()).toBe(0);
    await toStep1(user);
    expect(activeDotIndex()).toBe(1);
    await tap(user, screen.getByRole("button", { name: /^next$/i }));
    expect(activeDotIndex()).toBe(2);
  });

  it("footer next button only shows on steps 0 and 1", async () => {
    const { user } = await setup();
    expect(screen.getByRole("button", { name: /^next$/i })).toBeInTheDocument();
    await toStep2(user);
    expect(screen.queryByRole("button", { name: /^next$/i })).not.toBeInTheDocument();
  });
});
