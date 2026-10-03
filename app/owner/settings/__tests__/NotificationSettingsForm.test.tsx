import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NotificationSettingsForm from "../NotificationSettingsForm";

afterEach(() => vi.unstubAllGlobals());
describe("NotificationSettingsForm", () => {
  it("shows email enabled and SMS unavailable, and saves an editable recipient", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: true, emailOverride: "alerts@example.com", email: "alerts@example.com" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationSettingsForm initialEnabled initialEmailOverride={null} loginEmail="owner@example.com" />);
    expect(screen.getByRole("switch")).toBeChecked();
    expect(screen.getByLabelText("SMS notifications")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Notification email"), { target: { value: "alerts@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save notification settings" }));
    await screen.findByText("Notification settings saved.");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ enabled: true, emailOverride: "alerts@example.com", smsEnabled: false });
  });
  it("restores the login-email default and persists disabling notifications", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: false, emailOverride: null, email: "owner@example.com" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationSettingsForm initialEnabled initialEmailOverride="alerts@example.com" loginEmail="owner@example.com" />);
    fireEvent.click(screen.getByText("Use login email"));
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "Save notification settings" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ enabled: false, emailOverride: null, smsEnabled: false });
  });
});
