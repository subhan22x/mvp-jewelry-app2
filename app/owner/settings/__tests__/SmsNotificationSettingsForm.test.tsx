import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import SmsNotificationSettingsForm from "../SmsNotificationSettingsForm";

describe("SmsNotificationSettingsForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows SMS notifications as optional and disabled by default", () => {
    render(<SmsNotificationSettingsForm initialPhone="" initialEnabled={false} initialConsentAt={null} />);

    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByText(/Consent is optional and is not a condition/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  });

  it("submits the selected phone number and consent", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      smsNotificationPhone: "+15125550100",
      smsNotificationsEnabled: true,
      smsConsentAt: "2026-09-03T15:00:00.000Z"
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const user = userEvent.setup();

    render(<SmsNotificationSettingsForm initialPhone="" initialEnabled={false} initialConsentAt={null} />);
    await user.type(screen.getByLabelText("Mobile number"), "+1 512 555 0100");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Save SMS settings" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/owner/sms-notifications", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ phone: "+1 512 555 0100", enabled: true })
    }));
    expect(await screen.findByText("SMS notifications are enabled.")).toBeInTheDocument();
  });
});
