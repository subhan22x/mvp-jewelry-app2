import { render, screen } from "@testing-library/react";
import { act } from "react";
import userEvent from "@testing-library/user-event";
import NameBuilder from "../page";

async function renderBuilder() {
  await act(async () => {
    render(<NameBuilder />);
  });
}

async function typeText(user: ReturnType<typeof userEvent.setup>, element: HTMLElement, text: string) {
  await act(async () => {
    await user.type(element, text);
  });
}

async function click(user: ReturnType<typeof userEvent.setup>, element: HTMLElement) {
  await act(async () => {
    await user.click(element);
  });
}

describe("NameBuilder interactions", () => {
  it("requires a primary name, limits to two lines, and supports removing extra lines", async () => {
    const user = userEvent.setup();
    await renderBuilder();

    const nextButton = screen.getByRole("button", { name: /next/i });
    expect(nextButton).toBeDisabled();

    const primaryInput = screen.getByPlaceholderText(/text on pendant/i);
    await typeText(user, primaryInput, "Aurora");
    expect(nextButton).toBeEnabled();

    const addLineButton = screen.getByLabelText(/add another line/i);
    await click(user, addLineButton);

    const inputs = screen.getAllByRole("textbox");
    expect(inputs).toHaveLength(2);
    expect(screen.queryByLabelText(/add another line/i)).not.toBeInTheDocument();

    const removeLineButton = screen.getByLabelText(/remove name line/i);
    await click(user, removeLineButton);
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(nextButton).toBeEnabled();
  });

  it("keeps the selected emblem when switching gold combinations", async () => {
    const user = userEvent.setup();
    await renderBuilder();

    const primaryInput = screen.getByPlaceholderText(/text on pendant/i);
    await typeText(user, primaryInput, "Aurora");
    await click(user, screen.getByRole("button", { name: /next/i }));

    const emblemButton = screen.getByRole("button", { name: /money bag/i });
    await click(user, emblemButton);
    expect(emblemButton).toHaveAttribute("aria-pressed", "true");

    const comboLabels = [
      /^Yellow \+ White Gold$/i,
      /^Rose \+ White Gold$/i,
      /^White Gold$/i
    ];

    for (const label of comboLabels) {
      const comboButton = screen.getByRole("button", { name: label });
      await click(user, comboButton);
      expect(emblemButton).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("restores emblem selection after toggling the emblem switch", async () => {
    const user = userEvent.setup();
    await renderBuilder();

    const primaryInput = screen.getByPlaceholderText(/text on pendant/i);
    await typeText(user, primaryInput, "Aurora");
    await click(user, screen.getByRole("button", { name: /next/i }));

    const emblemButton = screen.getByRole("button", { name: /heart/i });
    await click(user, emblemButton);
    expect(emblemButton).toHaveAttribute("aria-pressed", "true");

    const toggleButton = screen.getByLabelText(/toggle emblem/i);
    await click(user, toggleButton);
    expect(toggleButton).toHaveAttribute("aria-pressed", "false");

    await click(user, toggleButton);
    expect(toggleButton).toHaveAttribute("aria-pressed", "true");
    expect(emblemButton).toHaveAttribute("aria-pressed", "true");
  });
});