"use client";

import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthApiError } from "@supabase/auth-js";
import { uploadFileDirectly } from "@/src/lib/uploads/direct-r2";
import {
  ONBOARDING_DRAFT_STORAGE_KEY,
  ONBOARDING_METADATA_KEY,
  type OnboardingDraft,
  onboardingDraftFromMetadata,
  onboardingDraftMetadata,
  parseOnboardingDraft,
  storedDraftForAuthenticatedEmail
} from "@/src/lib/onboarding/draft";
import { createClient } from "@/src/lib/supabase/client";

const GOLD = "#e8b06a";
const CREAM = "#ede4d4";
const DIM = "rgba(237,228,212,0.62)";
const SCREEN_COUNT = 6;

type InstagramStatus = "idle" | "checking" | "found" | "not_found" | "invalid" | "unknown";

function onboardingErrorMessage(error: unknown) {
  if (isAuthApiError(error)) {
    const message = error.message.toLowerCase();
    if (error.status === 429 || message.includes("rate limit")) {
      return "Email signups are temporarily rate limited. Please wait a few minutes and try again.";
    }
    if (message.includes("not authorized")) {
      return "This email could not receive a confirmation link yet. The site email sender needs custom SMTP enabled.";
    }
  }

  return error instanceof Error ? error.message : "Something went wrong.";
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="ob-eyebrow">
      <span />
      {children}
    </div>
  );
}

function Headline({ white, accent }: { white: string; accent?: string }) {
  return (
    <h1 className="ob-headline">
      {white}{" "}
      {accent && <span>{accent}</span>}
    </h1>
  );
}

function FormHead({ eyebrow, white, accent, sub }: { eyebrow?: string; white: string; accent?: string; sub: string }) {
  return (
    <div className="ob-form-head">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h1>
        {white}{accent && <> <span>{accent}</span></>}
      </h1>
      <p className="ob-sub">{sub}</p>
    </div>
  );
}

function FormField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  prefix,
  autoComplete
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  prefix?: string;
  autoComplete?: string;
}) {
  return (
    <label className="ob-label">
      <span>{label}</span>
      {prefix ? (
        <span className="ob-field">
          <b>{prefix}</b>
          <input
            className="ob-input ob-input-bare"
            type={type}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            autoComplete={autoComplete}
          />
        </span>
      ) : (
        <input
          className="ob-input"
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
      )}
    </label>
  );
}

function InstagramField({ value, onChange, status }: { value: string; onChange: (value: string) => void; status: InstagramStatus }) {
  const statusText = {
    idle: "",
    checking: "Checking…",
    found: "Account found",
    not_found: "Account not found",
    invalid: "Invalid username",
    unknown: "Could not verify"
  }[status];

  return (
    <label className="ob-label">
      <span className="ob-label-row">
        <span>Business Instagram</span>
        {statusText && <small className={`ob-instagram-status status-${status}`}>{statusText}</small>}
      </span>
      <span className={`ob-field ob-instagram-field status-${status}`}>
        <span className="ob-instagram-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3.5" y="3.5" width="17" height="17" rx="5.2" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="17.4" cy="6.8" r="1" fill="currentColor" />
          </svg>
        </span>
        <b>@</b>
        <input
          className="ob-input ob-input-bare"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="yourstore"
          autoComplete="off"
        />
        {status === "found" && <span className="ob-instagram-check" aria-label="Instagram account verified">✓</span>}
      </span>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-8.9 20-20 0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39 38 44 31.8 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" aria-hidden="true">
      <path d="M2 7h11M8.5 2.5L13.5 7l-5 4.5" stroke="#1a0e04" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl: string, name: string, type: string) {
  const [header, data] = dataUrl.split(",", 2);
  if (!header || !data) return undefined;
  const bytes = Uint8Array.from(atob(data), (character) => character.charCodeAt(0));
  return new File([bytes], name, { type });
}

function storeOnboardingDraft(draft: OnboardingDraft) {
  localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  sessionStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
}

function readOnboardingDraft() {
  const stored = localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);
  const legacy = sessionStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);
  const draft = parseOnboardingDraft(stored ?? legacy);
  if (draft && !stored) storeOnboardingDraft(draft);
  return draft;
}

function clearOnboardingDraft() {
  localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
  sessionStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);
  const pointerId = useRef<number | null>(null);

  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [instagramStatus, setInstagramStatus] = useState<InstagramStatus>("idle");
  const [businessName, setBusinessName] = useState("");
  const [logoFile, setLogoFile] = useState<File | undefined>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [authChecked, setAuthChecked] = useState(false);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [authMetadataDraft, setAuthMetadataDraft] = useState<OnboardingDraft | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const autoSubmitStarted = useRef(false);

  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : null), [logoFile]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  useEffect(() => {
    const saved = Number.parseInt(localStorage.getItem("vvs_onb") ?? "0", 10);
    if (saved > 0 && saved < SCREEN_COUNT) setScreen(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("vvs_onb", String(screen));
  }, [screen]);

  useEffect(() => {
    const username = instagramHandle.replace(/^@+/, "").trim();
    if (!username) {
      setInstagramStatus("idle");
      return;
    }
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(username) || username.includes("..") || username.startsWith(".") || username.endsWith(".")) {
      setInstagramStatus("invalid");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setInstagramStatus("checking");
      try {
        const response = await fetch(`/api/onboarding/instagram?username=${encodeURIComponent(username)}`, { signal: controller.signal });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          setInstagramStatus("unknown");
          return;
        }
        setInstagramStatus(json.status === "found" ? "found" : json.status === "not_found" ? "not_found" : json.status === "invalid" ? "invalid" : "unknown");
      } catch {
        if (!controller.signal.aborted) setInstagramStatus("unknown");
      }
    }, 650);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [instagramHandle]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      if (data.user) {
        const sessionResponse = await fetch("/api/auth/session");
        if (!active) return;
        if (sessionResponse.ok) {
          router.replace("/owner");
          return;
        }
      }
      setAuthedEmail(data.user?.email?.trim().toLowerCase() ?? null);
      setAuthMetadataDraft(onboardingDraftFromMetadata(data.user?.user_metadata, data.user?.email ?? ""));
      setAuthChecked(true);
    }).catch(() => {
      if (!active) return;
      setAuthedEmail(null);
      setAuthChecked(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    const storedDraft = authedEmail
      ? storedDraftForAuthenticatedEmail(readOnboardingDraft(), authedEmail)
      : readOnboardingDraft();
    const draft = storedDraft ?? authMetadataDraft;
    if (!draft) return;
    try {
      setOwnerName(draft.ownerName ?? "");
      setPhone(draft.phone ?? "");
      setInstagramHandle(draft.instagramHandle ?? "");
      setBusinessName(draft.businessName ?? "");
      setEmail(draft.email ?? "");
      const restoredLogo = draft.logo ? dataUrlToFile(draft.logo.dataUrl, draft.logo.name, draft.logo.type) : undefined;
      if (restoredLogo) setLogoFile(restoredLogo);
      setScreen(5);
      if (authedEmail && !autoSubmitStarted.current) {
        autoSubmitStarted.current = true;
        setIsSubmitting(true);
        setSubmitError("Email confirmed. Finishing your studio setup...");
        void createStudio(draft, restoredLogo).catch(error => {
          autoSubmitStarted.current = false;
          setSubmitError(onboardingErrorMessage(error));
          setIsSubmitting(false);
        });
      }
    } catch {
      clearOnboardingDraft();
    }
  }, [authChecked, authedEmail, authMetadataDraft]);

  const go = useCallback((next: number) => {
    setScreen(Math.max(0, Math.min(SCREEN_COUNT - 1, next)));
  }, []);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button, input, label, a")) return;
    pointerId.current = event.pointerId;
    startX.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (startX.current === null || pointerId.current !== event.pointerId) return;
    let distance = event.clientX - startX.current;
    if ((screen === 0 && distance > 0) || (screen === SCREEN_COUNT - 1 && distance < 0)) distance *= 0.32;
    setDrag(distance);
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (startX.current === null || pointerId.current !== event.pointerId) return;
    if (drag < -56) go(screen + 1);
    else if (drag > 56) go(screen - 1);
    startX.current = null;
    pointerId.current = null;
    setDrag(0);
  }

  async function buildDraft(): Promise<OnboardingDraft> {
    let logo: OnboardingDraft["logo"];
    if (logoFile && logoFile.size <= 2_500_000) {
      logo = { dataUrl: await fileToDataUrl(logoFile), name: logoFile.name, type: logoFile.type };
    }
    return { ownerName, phone, instagramHandle, businessName, email, logo };
  }

  async function createStudio(draft: OnboardingDraft, draftLogo = logoFile) {
    const form = new FormData();
    form.set("payload", JSON.stringify({
      businessName: draft.businessName,
      ownerName: draft.ownerName,
      phone: draft.phone,
      instagramHandle: draft.instagramHandle
    }));
    if (draftLogo) {
      const upload = await uploadFileDirectly(draftLogo, "onboarding");
      if (upload) form.set("logoUpload", JSON.stringify(upload));
      else form.set("logo", draftLogo);
    }

    const response = await fetch("/api/onboarding", { method: "POST", body: form });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error ?? "Failed to create account.");
    localStorage.removeItem("vvs_onb");
    clearOnboardingDraft();
    router.replace(json.ownerUrl ?? "/owner");
    router.refresh();
  }

  async function onGoogleClick() {
    setIsGoogleSubmitting(true);
    setSubmitError(null);
    try {
      storeOnboardingDraft(await buildDraft());
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/confirm?next=/onboarding`;
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
      if (error) throw error;
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to open Google sign-up.");
      setIsGoogleSubmitting(false);
    }
  }

  async function handleSubmit() {
    setSubmitError(null);
    if (businessName.trim().length < 2) {
      setSubmitError("Enter your business name before continuing.");
      setScreen(4);
      return;
    }
    if (!authedEmail) {
      if (!email.trim() || password.length < 6) {
        setSubmitError("Enter a valid email and a password with at least 6 characters.");
        setScreen(4);
        return;
      }
      if (password !== confirmPassword) {
        setSubmitError("Your passwords do not match.");
        setScreen(4);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const draft = await buildDraft();
      if (!authedEmail) {
        const normalizedEmail = email.trim().toLowerCase();
        draft.email = normalizedEmail;
        storeOnboardingDraft(draft);
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding`,
            data: { [ONBOARDING_METADATA_KEY]: onboardingDraftMetadata(draft) }
          }
        });
        if (error || !data.user) throw error ?? new Error("Unable to create your account.");

        if (!data.session && data.user.identities?.length === 0) {
          const signIn = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
          if (signIn.error || !signIn.data.session) {
            if (isAuthApiError(signIn.error) && signIn.error.code === "email_not_confirmed") {
              router.push(`/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`);
              return;
            }
            throw new Error("This email already has a login. Use the password you created earlier.");
          }
        } else if (!data.session) {
          router.push(`/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`);
          return;
        }
      }

      await createStudio(draft);
    } catch (error) {
      setSubmitError(onboardingErrorMessage(error));
      setIsSubmitting(false);
    }
  }

  const trackStyle: CSSProperties = {
    transform: `translateX(calc(${-screen * 100}% + ${drag}px))`,
    transition: startX.current === null ? "transform 0.42s cubic-bezier(0.22,1,0.36,1)" : "none"
  };

  return (
    <main className="ob-stage">
      <div
        className="ob-app"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="ob-glow" />
        <div className="ob-track" style={trackStyle}>
          <ScreenWelcome />
          <ScreenGetStarted
            ownerName={ownerName}
            phone={phone}
            instagramHandle={instagramHandle}
            instagramStatus={instagramStatus}
            setOwnerName={setOwnerName}
            setPhone={setPhone}
            setInstagramHandle={setInstagramHandle}
          />
          <ScreenProblem />
          <ScreenSolution />
          <ScreenAccount
            businessName={businessName}
            email={email}
            password={password}
            confirmPassword={confirmPassword}
            logoPreview={logoPreview}
            authedEmail={authedEmail}
            isGoogleSubmitting={isGoogleSubmitting}
            setBusinessName={setBusinessName}
            setEmail={setEmail}
            setPassword={setPassword}
            setConfirmPassword={setConfirmPassword}
            setLogoFile={setLogoFile}
            onGoogleClick={onGoogleClick}
          />
          <ScreenScope />
        </div>

        <div className="ob-topbar">
          <img src="/onboarding/vvs-design-logo.png" alt="VVS Design" />
          <button type="button" onClick={() => go(SCREEN_COUNT - 1)} className={screen === SCREEN_COUNT - 1 ? "ob-hidden" : ""}>
            Skip
          </button>
        </div>

        <div className="ob-nav">
          <div className="ob-dots" aria-label={`Onboarding screen ${screen + 1} of ${SCREEN_COUNT}`}>
            {Array.from({ length: SCREEN_COUNT }, (_, index) => (
              <button type="button" key={index} onClick={() => go(index)} aria-label={`Go to screen ${index + 1}`}>
                <span className={index === screen ? "active" : ""} />
              </button>
            ))}
          </div>
          {submitError && <p className="ob-error" role="alert">{submitError}</p>}
          <div className="ob-actions">
            {screen > 0 && (
              <button type="button" className="ob-back" onClick={() => go(screen - 1)} aria-label="Previous screen">
                <svg width="11" height="18" viewBox="0 0 11 18" fill="none" aria-hidden="true">
                  <path d="M9 2L2 9l7 7" stroke={CREAM} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className={`ob-continue${screen === SCREEN_COUNT - 1 ? " ob-final-cta" : ""}`}
              onClick={() => (screen === SCREEN_COUNT - 1 ? void handleSubmit() : go(screen + 1))}
              disabled={isSubmitting || !authChecked}
            >
              {screen === SCREEN_COUNT - 1 ? (isSubmitting ? "Creating your studio…" : "Accelerate your designs using AI") : "Continue"}
              <ArrowRight />
            </button>
          </div>
        </div>
      </div>
      <style>{onboardingStyles}</style>
    </main>
  );
}

function ScreenWelcome() {
  return (
    <section className="ob-screen">
      <div className="ob-welcome-image" />
      <div className="ob-ai-orbit" aria-hidden="true">
        <span className="ob-orbit-ring ob-orbit-ring-one" />
        <span className="ob-orbit-ring ob-orbit-ring-two" />
        <span className="ob-orbit-core">✦</span>
        <small>AI</small>
      </div>
      <div className="ob-welcome-fade" />
      <div className="ob-body ob-bottom-body">
        <Eyebrow>The AI Studio for Jewelers</Eyebrow>
        <div className="ob-gap-16" />
        <Headline white="Convert 2× more high paying customers —" accent="using AI." />
        <p className="ob-sub ob-welcome-sub">Turn browsers into custom orders with a design studio that does the selling for you.</p>
      </div>
    </section>
  );
}

function ScreenGetStarted({
  ownerName,
  phone,
  instagramHandle,
  instagramStatus,
  setOwnerName,
  setPhone,
  setInstagramHandle
}: {
  ownerName: string;
  phone: string;
  instagramHandle: string;
  instagramStatus: InstagramStatus;
  setOwnerName: (value: string) => void;
  setPhone: (value: string) => void;
  setInstagramHandle: (value: string) => void;
}) {
  return (
    <section className="ob-screen">
      <div className="ob-form-body" onPointerDown={(event) => event.stopPropagation()}>
        <FormHead white="Basic Info" sub="Add the essentials for your studio profile." />
        <div className="ob-form-stack">
          <FormField label="Your name" placeholder="Jordan Vance" value={ownerName} onChange={setOwnerName} autoComplete="name" />
          <FormField label="Phone number" placeholder="(555) 123-4567" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
          <InstagramField value={instagramHandle} onChange={setInstagramHandle} status={instagramStatus} />
        </div>
      </div>
    </section>
  );
}

function FrictionRoadmap() {
  return (
    <div className="ob-problem-visual">
      <svg
        className="ob-roadmap"
        viewBox="0 0 360 300"
        role="img"
        aria-labelledby="friction-roadmap-title friction-roadmap-description"
      >
        <title id="friction-roadmap-title">Three points of friction in a custom jewelry sale</title>
        <desc id="friction-roadmap-description">A winding path connects design, pricing, and communication, with a broken handoff before pricing.</desc>
        <defs>
          <radialGradient id="ob-roadmap-glow" cx="50%" cy="48%" r="56%">
            <stop offset="0%" stopColor="#b36b38" stopOpacity=".2" />
            <stop offset="100%" stopColor="#b36b38" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="180" cy="145" rx="166" ry="134" fill="url(#ob-roadmap-glow)" />
        <path className="ob-journey-line" d="M32 292V225c0-26 7-48 18-62" />
        <path className="ob-journey-line" d="M67 100c0-45 53-49 86-22 28 23 43 57 40 90" />
        <path className="ob-journey-line" d="M211 244c32 34 71 15 86-22 16-40 5-85-21-112" />
        <path className="ob-journey-break" d="M193 177l-8 9m18-3-5 11" />

        <g className="ob-friction-node">
          <circle className="ob-node-ring" cx="67" cy="136" r="43" />
          <circle className="ob-node-core" cx="67" cy="136" r="35" />
          <path className="ob-node-icon" d="M56 147l3-10 13-13 7 7-13 13-10 3zm4-11 7 7" />
          <text x="67" y="187">DESIGN</text>
        </g>

        <g className="ob-friction-node">
          <circle className="ob-node-ring" cx="185" cy="220" r="44" />
          <circle className="ob-node-core" cx="185" cy="220" r="36" />
          <path className="ob-node-icon" d="M174 211h13l10 10-12 12-11-11v-11zm6 5h.1" />
          <text x="185" y="274">PRICING</text>
        </g>

        <g className="ob-friction-node">
          <circle className="ob-node-ring" cx="292" cy="76" r="43" />
          <circle className="ob-node-core" cx="292" cy="76" r="35" />
          <path className="ob-node-icon" d="M278 75a14 12 0 1 1 5 9l-7 2 2-7a12 12 0 0 1 0-4z" />
          <text x="292" y="127">COMMUNICATION</text>
        </g>
      </svg>
    </div>
  );
}

function ScreenProblem() {
  return (
    <section className="ob-screen">
      <FrictionRoadmap />
      <div className="ob-body ob-story-body ob-problem-body">
        <Eyebrow>The Problem</Eyebrow>
        <div className="ob-gap-16" />
        <Headline white="Most jewelers lose custom orders to" accent="friction." />
        <p className="ob-sub ob-welcome-sub">Unclear visuals, slow pricing, and scattered messages break the sale before it reaches the bench.</p>
      </div>
    </section>
  );
}

function ScreenSolution() {
  return (
    <section className="ob-screen">
      <div className="ob-solution-visual">
        <div className="ob-solution-glow" />
        <div className="ob-phone ob-float"><img src="/onboarding/app-screen-1.png" alt="VVS pendant design flow" /></div>
      </div>
      <div className="ob-body ob-story-body">
        <Eyebrow>The Fix</Eyebrow>
        <div className="ob-gap-16" />
        <Headline white="We fix that — by letting your customers" accent="design it." />
        <p className="ob-sub ob-welcome-sub">They style the piece, see it iced out, and you get a ready-to-quote order. No friction.</p>
      </div>
    </section>
  );
}

function ScreenAccount({
  businessName,
  email,
  password,
  confirmPassword,
  logoPreview,
  authedEmail,
  isGoogleSubmitting,
  setBusinessName,
  setEmail,
  setPassword,
  setConfirmPassword,
  setLogoFile,
  onGoogleClick
}: {
  businessName: string;
  email: string;
  password: string;
  confirmPassword: string;
  logoPreview: string | null;
  authedEmail: string | null;
  isGoogleSubmitting: boolean;
  setBusinessName: (value: string) => void;
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setLogoFile: (value: File | undefined) => void;
  onGoogleClick: () => Promise<void>;
}) {
  function pickLogo(event: ChangeEvent<HTMLInputElement>) {
    setLogoFile(event.target.files?.[0]);
  }

  return (
    <section className="ob-screen">
      <div className="ob-form-body ob-account-body" onPointerDown={(event) => event.stopPropagation()}>
        <FormHead eyebrow="Create Account" white="Setup your" accent="profile." sub="Your logo or store name will be shown on the design tool." />
        <div className="ob-form-stack">
          <FormField label="Business name" placeholder="VVS Custom Jewelers" value={businessName} onChange={setBusinessName} autoComplete="organization" />
          <label className="ob-label">
            <span>Business logo</span>
            <span className="ob-logo-row">
              <span className="ob-logo-box" style={logoPreview ? { backgroundImage: `url(${logoPreview})` } : undefined}>
                {!logoPreview && <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 16V6m0 0L8 10m4-4l4 4M5 18h14" stroke={GOLD} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </span>
              <span className="ob-logo-help">{logoPreview ? "Logo added — tap to replace" : "Tap to upload a PNG or JPG.\nShows up on your customer quotes."}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickLogo} />
            </span>
          </label>
          {authedEmail ? (
            <div className="ob-authenticated">Signed in as <strong>{authedEmail}</strong></div>
          ) : (
            <>
              <FormField label="Email" placeholder="you@store.com" value={email} onChange={setEmail} type="email" autoComplete="email" />
              <FormField label="Create password" placeholder="••••••••" value={password} onChange={setPassword} type="password" autoComplete="new-password" />
              <FormField label="Confirm password" placeholder="••••••••" value={confirmPassword} onChange={setConfirmPassword} type="password" autoComplete="new-password" />
              <div className="ob-divider"><span /><b>or</b><span /></div>
              <button type="button" className="ob-google" onClick={() => void onGoogleClick()} disabled={isGoogleSubmitting}>
                <GoogleIcon /> {isGoogleSubmitting ? "Opening Google…" : "Sign up with Google"}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const categories = [
  { key: "Pendants", live: true },
  { key: "Bracelets", live: true },
  { key: "Grillz", live: true },
  { key: "Rings", live: false },
  { key: "Chains", live: false }
];

function ScreenScope() {
  return (
    <section className="ob-screen">
      <div className="ob-scope-image" />
      <div className="ob-scope-fade" />
      <div className="ob-body ob-bottom-body">
        <Eyebrow>What They Can Make</Eyebrow>
        <div className="ob-gap-16" />
        <Headline white="Custom Pendants, Bracelets & Grillz —" accent="more coming soon." />
        <div className="ob-categories">
          {categories.map((category) => (
            <span className={category.live ? "live" : ""} key={category.key}>
              {category.live && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3L9.6 3.5" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              {category.key}{!category.live && <small>soon</small>}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

const onboardingStyles = `
  .ob-stage { min-height: 100dvh; display: flex; align-items: center; justify-content: center; overflow: hidden; background: radial-gradient(80% 55% at 50% 0%, rgba(86,56,28,.55), rgba(40,26,14,.2) 38%, rgba(11,8,5,0) 70%), #0b0805; color: ${CREAM}; }
  .ob-app { --screen-bg:#110a05; position: relative; width: min(100vw, 430px); height: 100dvh; max-height: 932px; overflow: hidden; background: var(--screen-bg); touch-action: pan-y; user-select: none; box-shadow: 0 0 80px rgba(0,0,0,.45); }
  .ob-app * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
  .ob-app input, .ob-app button { font-family: var(--font-figtree), sans-serif; }
  .ob-glow { position:absolute; inset:0; background:radial-gradient(120% 70% at 50% -8%, rgba(192,138,66,.5) 0%, rgba(120,74,40,.18) 30%, rgba(20,12,6,0) 62%); pointer-events:none; }
  .ob-track { display:flex; width:100%; height:100%; }
  .ob-screen { width:100%; height:100%; flex:0 0 100%; position:relative; overflow:hidden; }
  .ob-body { position:absolute; inset:0; z-index:10; display:flex; flex-direction:column; padding:110px 26px 156px; }
  .ob-bottom-body { justify-content:flex-end; }
  .ob-centered-body { justify-content:center; }
  .ob-story-body { top:58%; bottom:auto; padding:0 26px; }
  .ob-form-body { position:absolute; inset:0; z-index:10; overflow-y:auto; display:flex; flex-direction:column; padding:96px 26px 150px; user-select:text; scrollbar-width:none; }
  .ob-form-body::-webkit-scrollbar { display:none; }
  .ob-account-body { padding-bottom:164px; }
  .ob-eyebrow { display:inline-flex; align-items:center; gap:8px; font:700 11.5px/1 var(--font-figtree),sans-serif; letter-spacing:.22em; text-transform:uppercase; color:${GOLD}; }
  .ob-eyebrow span { width:16px; height:1.5px; background:${GOLD}; opacity:.7; display:inline-block; }
  .ob-headline { margin:0; font:800 clamp(30px,8.2vw,35px)/1.08 var(--font-figtree),sans-serif; letter-spacing:-.025em; color:#fff; text-wrap:balance; }
  .ob-headline span, .ob-form-head h1 span { font-family:var(--font-the-shuffle),cursive; font-weight:400; font-style:italic; color:${GOLD}; letter-spacing:.005em; font-size:1.15em; line-height:1; }
  .ob-sub { margin:0; font:400 15.5px/1.5 var(--font-figtree),sans-serif; color:${DIM}; max-width:320px; text-wrap:pretty; }
  .ob-welcome-sub { margin-top:14px; }
  .ob-gap-16 { height:16px; flex:0 0 auto; }
  .ob-welcome-image { position:absolute; top:4%; left:0; right:0; height:52%; background:url('/onboarding/hero-ipad-display.png') center top/contain no-repeat; }
  .ob-ai-orbit { position:absolute; top:29%; left:11%; z-index:4; width:86px; height:86px; display:grid; place-items:center; color:${GOLD}; filter:drop-shadow(0 8px 18px rgba(0,0,0,.5)); }
  .ob-orbit-ring { position:absolute; inset:0; border-radius:50%; border:1px solid rgba(232,176,106,.34); }
  .ob-orbit-ring-one:before,.ob-orbit-ring-two:before { content:""; position:absolute; width:7px; height:7px; border-radius:50%; background:${GOLD}; box-shadow:0 0 12px rgba(232,176,106,.9); }
  .ob-orbit-ring-one:before { top:5px; left:18px; }
  .ob-orbit-ring-two { inset:13px; border-color:rgba(232,176,106,.2); }
  .ob-orbit-ring-two:before { right:-3px; bottom:17px; width:5px; height:5px; }
  .ob-orbit-core { width:38px; height:38px; display:grid; place-items:center; border-radius:50%; background:rgba(15,9,5,.86); border:1px solid rgba(232,176,106,.5); font-size:19px; }
  .ob-ai-orbit small { position:absolute; bottom:-4px; padding:3px 8px; border-radius:999px; background:rgba(15,9,5,.88); border:1px solid rgba(232,176,106,.28); font:800 8px/1 var(--font-figtree),sans-serif; letter-spacing:.2em; }
  .ob-welcome-fade { position:absolute; inset:0 0 auto; height:64%; background:linear-gradient(180deg,rgba(8,5,3,0) 0%,rgba(8,5,3,0) 44%,rgba(10,6,4,.5) 72%,var(--screen-bg) 100%); }
  .ob-form-head { margin-bottom:24px; }
  .ob-form-head h1 { margin:14px 0 0; font:800 28px/1.1 var(--font-figtree),sans-serif; letter-spacing:-.025em; color:#fff; }
  .ob-form-head .ob-sub { margin-top:10px; font-size:14.5px; }
  .ob-form-stack { display:flex; flex-direction:column; gap:18px; }
  .ob-label { display:block; font-family:var(--font-figtree),sans-serif; }
  .ob-label > span:first-child { display:block; margin-bottom:8px; font-size:12.5px; font-weight:600; letter-spacing:.01em; color:${CREAM}; opacity:.85; }
  .ob-label > .ob-label-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .ob-label-row > span { color:${CREAM}; }
  .ob-instagram-status { font-size:11px; font-weight:700; color:rgba(237,228,212,.46); }
  .ob-instagram-status.status-found { color:#e8b06a; }
  .ob-instagram-status.status-not_found,.ob-instagram-status.status-invalid { color:#fca5a5; }
  .ob-input { width:100%; height:50px; border-radius:14px; background:rgba(237,228,212,.05); border:1px solid rgba(237,228,212,.12); color:#fff; font-size:15.5px; font-weight:500; padding:0 16px; outline:none; transition:.2s; }
  .ob-input::placeholder { color:rgba(237,228,212,.32); font-weight:400; }
  .ob-input:focus, .ob-field:focus-within { border-color:rgba(232,176,106,.7); background:rgba(237,228,212,.08); }
  .ob-field { display:flex; align-items:center; padding-left:14px; border-radius:14px; background:rgba(237,228,212,.05); border:1px solid rgba(237,228,212,.12); transition:.2s; }
  .ob-field b { color:rgba(237,228,212,.45); font-size:15.5px; font-weight:500; margin-right:2px; }
  .ob-instagram-field { padding-left:11px; }
  .ob-instagram-field.status-found { border-color:rgba(232,176,106,.6); }
  .ob-instagram-field.status-not_found,.ob-instagram-field.status-invalid { border-color:rgba(248,113,113,.55); }
  .ob-instagram-icon { display:flex; margin-right:8px; color:rgba(237,228,212,.42); }
  .ob-instagram-field.status-found .ob-instagram-icon { color:#e8b06a; }
  .ob-instagram-check { display:grid; place-items:center; flex:0 0 22px; height:22px; margin-right:12px; border-radius:50%; background:${GOLD}; color:#1a0e04; font-size:12px; font-weight:900; }
  .ob-input-bare { background:none; border:0; height:48px; padding:0 14px 0 2px; border-radius:0; }
  .ob-input-bare:focus { background:none; }
  .ob-problem-body .ob-eyebrow { gap:10px; font-size:14px; letter-spacing:.18em; }
  .ob-problem-body .ob-eyebrow span { width:25px; height:2px; }
  .ob-problem-visual { position:absolute; top:7%; left:16px; right:16px; height:48%; z-index:4; display:flex; align-items:center; justify-content:center; }
  .ob-roadmap { width:100%; max-width:380px; overflow:visible; font-family:var(--font-figtree),sans-serif; filter:drop-shadow(0 22px 36px rgba(0,0,0,.34)); }
  .ob-journey-line { fill:none; stroke:rgba(237,228,212,.52); stroke-width:3.4; stroke-linecap:round; stroke-dasharray:1 10; }
  .ob-journey-break { fill:none; stroke:#dc845e; stroke-width:3.4; stroke-linecap:round; }
  .ob-node-ring { fill:none; stroke:rgba(232,176,106,.16); stroke-width:1; }
  .ob-node-core { fill:rgba(24,14,8,.94); stroke:rgba(232,176,106,.78); stroke-width:1.7; }
  .ob-node-icon { fill:none; stroke:${GOLD}; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
  .ob-friction-node text { fill:${CREAM}; font-size:9.5px; font-weight:800; letter-spacing:.13em; text-anchor:middle; }
  .ob-solution-visual { position:absolute; top:7%; left:0; right:0; height:52%; display:flex; justify-content:center; align-items:flex-start; }
  .ob-solution-glow { position:absolute; top:12%; width:240px; height:240px; border-radius:50%; background:radial-gradient(circle,rgba(232,176,106,.32),rgba(232,176,106,0) 70%); filter:blur(8px); }
  .ob-phone { position:relative; width:186px; border-radius:26px; overflow:hidden; border:1px solid rgba(237,228,212,.14); box-shadow:0 30px 60px -18px rgba(0,0,0,.7),0 0 0 6px rgba(255,255,255,.03); }
  .ob-phone img { width:100%; display:block; }
  @keyframes obFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
  @media (prefers-reduced-motion:no-preference) { .ob-float { animation:obFloat 5.5s ease-in-out infinite; } }
  .ob-logo-row { position:relative; display:flex; align-items:center; gap:14px; cursor:pointer; }
  .ob-logo-box { width:64px; height:64px; flex:0 0 64px; border-radius:16px; border:1.5px dashed rgba(237,228,212,.28); background:rgba(237,228,212,.04) center/cover; display:flex; align-items:center; justify-content:center; }
  .ob-logo-help { white-space:pre-line; font-size:13.5px; line-height:1.4; color:${DIM}; }
  .ob-logo-row input { position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; }
  .ob-divider { display:flex; align-items:center; gap:14px; margin:4px 0; }
  .ob-divider span { flex:1; height:1px; background:rgba(237,228,212,.12); }
  .ob-divider b { font-size:12px; color:rgba(237,228,212,.4); font-weight:500; }
  .ob-google { width:100%; height:52px; border-radius:14px; cursor:pointer; background:#fff; border:0; color:#1f1f1f; display:flex; align-items:center; justify-content:center; gap:11px; font-size:15px; font-weight:600; box-shadow:0 6px 18px -8px rgba(0,0,0,.5); }
  .ob-google:disabled { opacity:.65; cursor:wait; }
  .ob-authenticated { padding:14px 16px; border:1px solid rgba(232,176,106,.3); border-radius:14px; background:rgba(212,146,74,.12); color:${DIM}; font-size:14px; }
  .ob-authenticated strong { color:#fff; }
  .ob-scope-image { position:absolute; inset:0 0 auto; height:46%; background:url('/onboarding/hero-jewelry.png') 50% 30%/cover; }
  .ob-scope-fade { position:absolute; inset:0 0 auto; height:58%; background:linear-gradient(180deg,rgba(8,5,3,.25),rgba(8,5,3,0) 22%,rgba(10,6,4,.6) 62%,var(--screen-bg) 100%); }
  .ob-categories { display:flex; flex-wrap:wrap; gap:8px; margin-top:22px; }
  .ob-categories > span { display:inline-flex; align-items:center; gap:7px; padding:8px 14px; border-radius:999px; color:${DIM}; background:rgba(237,228,212,.04); border:1px solid rgba(237,228,212,.08); font:600 13.5px/1 var(--font-figtree),sans-serif; }
  .ob-categories > span.live { color:#fff; background:rgba(212,146,74,.16); border-color:rgba(232,176,106,.4); }
  .ob-categories small { font-size:10px; opacity:.7; }
  .ob-topbar { position:absolute; top:max(24px,env(safe-area-inset-top)); left:0; right:0; z-index:30; display:flex; align-items:center; justify-content:space-between; padding:12px 24px; pointer-events:none; }
  .ob-topbar img { width:auto; height:18px; opacity:.92; }
  .ob-topbar button { pointer-events:auto; background:none; border:0; font-size:13.5px; font-weight:600; color:${DIM}; cursor:pointer; transition:opacity .3s; }
  .ob-topbar button.ob-hidden { opacity:0; pointer-events:none; }
  .ob-nav { position:absolute; bottom:max(24px,env(safe-area-inset-bottom)); left:0; right:0; z-index:30; padding:0 24px; display:flex; flex-direction:column; gap:16px; pointer-events:none; }
  .ob-dots { display:flex; justify-content:center; align-items:center; gap:7px; }
  .ob-dots button { width:auto; height:12px; padding:0; border:0; background:none; cursor:pointer; pointer-events:auto; display:flex; align-items:center; }
  .ob-dots span { display:block; width:7px; height:7px; border-radius:999px; background:rgba(237,228,212,.26); transition:.35s cubic-bezier(.22,1,.36,1); }
  .ob-dots span.active { width:26px; background:${GOLD}; }
  .ob-actions { display:flex; align-items:center; gap:12px; }
  .ob-actions button { pointer-events:auto; }
  .ob-back { width:54px; height:54px; flex:0 0 54px; border-radius:999px; border:1px solid rgba(237,228,212,.16); background:rgba(237,228,212,.05); display:flex; align-items:center; justify-content:center; cursor:pointer; }
  .ob-continue { flex:1; height:54px; border-radius:999px; cursor:pointer; border:0; background:linear-gradient(170deg,#e8b06a,#d4924a); box-shadow:0 0 0 1px rgba(232,176,106,.35),0 12px 28px -10px rgba(212,146,74,.7); color:#1a0e04; font-size:16px; font-weight:700; letter-spacing:-.01em; display:flex; align-items:center; justify-content:center; gap:8px; }
  .ob-final-cta { gap:6px; font-size:14px; }
  .ob-continue:disabled { opacity:.65; cursor:wait; }
  .ob-error { pointer-events:auto; margin:0; padding:9px 12px; border-radius:12px; border:1px solid rgba(248,113,113,.25); background:rgba(127,29,29,.82); color:#fee2e2; font:600 12px/1.35 var(--font-figtree),sans-serif; text-align:center; }
  @media (max-height:760px) { .ob-form-body { padding-top:78px; } .ob-body { padding-top:92px; padding-bottom:136px; } .ob-story-body { top:55%; padding:0 26px; } .ob-problem-visual { top:6%; height:45%; } .ob-nav { bottom:14px; } .ob-account-body { padding-bottom:140px; } }
  @media (max-height:640px) { .ob-story-body { top:48%; } .ob-problem-visual { top:4%; height:41%; } .ob-solution-visual { top:2%; transform:scale(.84); transform-origin:top center; } }
  @media (min-width:431px) { .ob-app { border-left:1px solid rgba(237,228,212,.08); border-right:1px solid rgba(237,228,212,.08); } }
`;
