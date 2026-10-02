import {
  ONBOARDING_METADATA_KEY,
  onboardingDraftFromMetadata,
  onboardingDraftMetadata,
  parseOnboardingDraft,
  storedDraftForAuthenticatedEmail
} from "../draft";

describe("onboarding draft", () => {
  it("restores profile fields and an optional logo without accepting a password", () => {
    const draft = parseOnboardingDraft(JSON.stringify({
      ownerName: "Jordan",
      phone: "555-0100",
      smsConsent: true,
      instagramHandle: "jordanice",
      businessName: "Jordan ICE",
      email: "owner@example.com",
      password: "must-not-be-restored",
      logo: { dataUrl: "data:image/png;base64,AA==", name: "logo.png", type: "image/png" }
    }));

    expect(draft).toEqual({
      ownerName: "Jordan",
      phone: "555-0100",
      smsConsent: true,
      instagramHandle: "jordanice",
      businessName: "Jordan ICE",
      email: "owner@example.com",
      logo: { dataUrl: "data:image/png;base64,AA==", name: "logo.png", type: "image/png" }
    });
    expect(draft).not.toHaveProperty("password");
  });

  it("returns null for malformed stored data", () => {
    expect(parseOnboardingDraft("not-json")).toBeNull();
    expect(parseOnboardingDraft(null)).toBeNull();
  });

  it("uses safe profile metadata as a cross-device fallback", () => {
    const original = {
      ownerName: "Jordan",
      phone: "555-0100",
      smsConsent: true,
      instagramHandle: "jordanice",
      businessName: "Jordan ICE",
      email: "owner@example.com"
    };

    const metadata = { [ONBOARDING_METADATA_KEY]: onboardingDraftMetadata(original) };
    expect(onboardingDraftFromMetadata(metadata, original.email)).toEqual(original);
  });

  it("does not restore another account's stale browser draft", () => {
    const draft = parseOnboardingDraft(JSON.stringify({
      ownerName: "Jordan",
      phone: "",
      smsConsent: false,
      instagramHandle: "",
      businessName: "Jordan ICE",
      email: "first@example.com"
    }));

    expect(storedDraftForAuthenticatedEmail(draft, "FIRST@example.com")).toEqual(draft);
    expect(storedDraftForAuthenticatedEmail(draft, "second@example.com")).toBeNull();
  });
});
