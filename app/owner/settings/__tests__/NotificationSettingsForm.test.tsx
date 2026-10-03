import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NotificationSettingsForm from "../NotificationSettingsForm";

afterEach(() => vi.unstubAllGlobals());
describe("NotificationSettingsForm", () => {
  it("shows email enabled and SMS unavailable, and saves an editable recipient", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: true, emailOverride: "alerts@example.com", email: "alerts@example.com" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationSettingsForm initialEnabled initialTimeZone="UTC" initialEmailOverride={null} loginEmail="owner@example.com" />);
    expect(screen.getByRole("switch")).toBeChecked();
    expect(screen.getByLabelText("SMS notifications")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Notification email"), { target: { value: "alerts@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save notification settings" }));
    await screen.findByText("Notification settings saved.");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ enabled: true, emailOverride: "alerts@example.com", smsEnabled: false, timeZone: "UTC" });
  });
  it("restores the login-email default and persists disabling notifications", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: false, emailOverride: null, email: "owner@example.com" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationSettingsForm initialEnabled initialTimeZone="UTC" initialEmailOverride="alerts@example.com" loginEmail="owner@example.com" />);
    fireEvent.click(screen.getByText("Use login email"));
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "Save notification settings" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ enabled: false, emailOverride: null, smsEnabled: false, timeZone: "UTC" });
  });
  it("keeps a saved zone and saves a changed zone with the other preferences", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ enabled: true, emailOverride: null, email: "owner@example.com", timeZone: "Asia/Karachi" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<NotificationSettingsForm initialEnabled initialTimeZone="America/Chicago" initialEmailOverride={null} loginEmail="owner@example.com" />);
    expect(screen.getByLabelText("Notification time zone")).toHaveValue("America/Chicago");
    fireEvent.change(screen.getByLabelText("Notification time zone"), { target: { value: "Asia/Karachi" } });
    fireEvent.click(screen.getByRole("button", { name: "Save notification settings" }));
    await screen.findByText("Notification settings saved.");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).timeZone).toBe("Asia/Karachi");
  });
  it("suggests the browser zone for an Account without a saved preference", () => {
    render(<NotificationSettingsForm initialEnabled initialEmailOverride={null} loginEmail="owner@example.com" />);
    expect(screen.getByLabelText("Notification time zone")).toHaveValue(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

});
