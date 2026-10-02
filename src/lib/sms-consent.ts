export const SMS_CONSENT_VERSION = "2026-09-03";

export const SMS_CONSENT_TEXT = "I agree to receive recurring operational text messages from Grow Jewelry about my account and customer quote requests. Message frequency varies. Message and data rates may apply. Reply STOP to opt out or HELP for help. Consent is optional and is not a condition of creating an account or using Grow Jewelry.";

export const SMS_CONSENT_SOURCE = {
  onboarding: "onboarding",
  settings: "settings"
} as const;

export function smsConsentRecord(source: typeof SMS_CONSENT_SOURCE[keyof typeof SMS_CONSENT_SOURCE], consentedAt = new Date()) {
  return {
    smsNotificationsEnabled: true,
    smsConsentAt: consentedAt,
    smsConsentSource: source,
    smsConsentVersion: SMS_CONSENT_VERSION,
    smsOptedOutAt: null
  };
}
