export const ONBOARDING_DRAFT_STORAGE_KEY = "vvs_onb_draft";
export const ONBOARDING_METADATA_KEY = "vvs_onboarding";

export type OnboardingDraft = {
  ownerName: string;
  phone: string;
  instagramHandle: string;
  businessName: string;
  email: string;
  logo?: {
    dataUrl: string;
    name: string;
    type: string;
  };
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function parseOnboardingDraft(raw: string | null): OnboardingDraft | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== "object") return null;

    const logoValue = value.logo;
    const logo = logoValue && typeof logoValue === "object"
      ? logoValue as Record<string, unknown>
      : null;

    return {
      ownerName: cleanString(value.ownerName),
      phone: cleanString(value.phone),
      instagramHandle: cleanString(value.instagramHandle),
      businessName: cleanString(value.businessName),
      email: cleanString(value.email),
      ...(logo
        && typeof logo.dataUrl === "string"
        && typeof logo.name === "string"
        && typeof logo.type === "string"
        ? { logo: { dataUrl: logo.dataUrl, name: logo.name, type: logo.type } }
        : {})
    };
  } catch {
    return null;
  }
}

export function onboardingDraftMetadata(draft: OnboardingDraft) {
  return {
    ownerName: draft.ownerName,
    phone: draft.phone,
    instagramHandle: draft.instagramHandle,
    businessName: draft.businessName
  };
}

export function onboardingDraftFromMetadata(metadata: unknown, email: string): OnboardingDraft | null {
  if (!metadata || typeof metadata !== "object") return null;
  const candidate = (metadata as Record<string, unknown>)[ONBOARDING_METADATA_KEY];
  if (!candidate || typeof candidate !== "object") return null;
  const value = candidate as Record<string, unknown>;

  const draft = {
    ownerName: cleanString(value.ownerName),
    phone: cleanString(value.phone),
    instagramHandle: cleanString(value.instagramHandle),
    businessName: cleanString(value.businessName),
    email
  };

  return draft.businessName.trim().length >= 2 ? draft : null;
}

export function storedDraftForAuthenticatedEmail(draft: OnboardingDraft | null, authenticatedEmail: string) {
  if (!draft) return null;
  const draftEmail = draft.email.trim().toLowerCase();
  const normalizedAuthenticatedEmail = authenticatedEmail.trim().toLowerCase();
  return !draftEmail || draftEmail === normalizedAuthenticatedEmail ? draft : null;
}
