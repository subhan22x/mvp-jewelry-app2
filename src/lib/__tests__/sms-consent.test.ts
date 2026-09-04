import { describe, expect, it } from "vitest";
import { SMS_CONSENT_TEXT, SMS_CONSENT_VERSION, smsConsentRecord } from "../sms-consent";

describe("SMS consent", () => {
  it("keeps the approved disclosure tied to its audit version", () => {
    expect(SMS_CONSENT_VERSION).toBe("2026-09-03");
    expect(SMS_CONSENT_TEXT).toBe(
      "I agree to receive recurring operational text messages from Grow Jewelry about my account and customer quote requests. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is optional and is not a condition of creating an account or using Grow Jewelry."
    );
  });

  it("creates a complete affirmative-consent audit record", () => {
    const consentedAt = new Date("2026-09-03T18:00:00.000Z");

    expect(smsConsentRecord("settings", consentedAt)).toEqual({
      smsNotificationsEnabled: true,
      smsConsentAt: consentedAt,
      smsConsentSource: "settings",
      smsConsentVersion: "2026-09-03",
      smsOptedOutAt: null
    });
  });
});
