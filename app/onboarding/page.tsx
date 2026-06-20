"use client";

import type { ChangeEvent, CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFileDirectly } from "@/src/lib/uploads/direct-r2";
import { createClient } from "@/src/lib/supabase/client";

const GOLD = "#e8b06a";
const CREAM = "#ede4d4";
const DIM = "rgba(237,228,212,0.62)";
const SCREEN_COUNT = 6;

type Draft = {
  ownerName: string;
  phone: string;
  instagramHandle: string;
  businessName: string;
  email: string;
  password: string;
  logo?: { dataUrl: string; name: string; type: string };
};

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

function FormHead({ eyebrow, white, accent, sub }: { eyebrow: string; white: string; accent: string; sub: string }) {
  return (
    <div className="ob-form-head">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1>
        {white} <span>{accent}</span>
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

export default function OnboardingPage() {
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);
  const pointerId = useRef<number | null>(null);

  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [logoFile, setLogoFile] = useState<File | undefined>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [authChecked, setAuthChecked] = useState(false);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      setAuthedEmail(data.user?.email ?? null);
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
    const rawDraft = sessionStorage.getItem("vvs_onb_draft");
    if (!rawDraft) return;
    try {
      const draft = JSON.parse(rawDraft) as Draft;
      setOwnerName(draft.ownerName ?? "");
      setPhone(draft.phone ?? "");
      setInstagramHandle(draft.instagramHandle ?? "");
      setBusinessName(draft.businessName ?? "");
      setEmail(draft.email ?? "");
      setPassword(draft.password ?? "");
      setConfirmPassword(draft.password ?? "");
      if (draft.logo) setLogoFile(dataUrlToFile(draft.logo.dataUrl, draft.logo.name, draft.logo.type));
      setScreen(5);
      sessionStorage.removeItem("vvs_onb_draft");
    } catch {
      sessionStorage.removeItem("vvs_onb_draft");
    }
  }, [authChecked]);

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

  async function buildDraft(): Promise<Draft> {
    let logo: Draft["logo"];
    if (logoFile && logoFile.size <= 2_500_000) {
      logo = { dataUrl: await fileToDataUrl(logoFile), name: logoFile.name, type: logoFile.type };
    }
    return { ownerName, phone, instagramHandle, businessName, email, password, logo };
  }

  async function onGoogleClick() {
    setIsGoogleSubmitting(true);
    setSubmitError(null);
    try {
      sessionStorage.setItem("vvs_onb_draft", JSON.stringify(await buildDraft()));
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
      if (!authedEmail) {
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding` }
        });
        if (error || !data.user) throw error ?? new Error("Unable to create your account.");

        if (!data.session && data.user.identities?.length === 0) {
          const signIn = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
          if (signIn.error || !signIn.data.session) {
            throw new Error("This email already has a login. Use the password you created earlier.");
          }
        } else if (!data.session) {
          sessionStorage.setItem("vvs_onb_draft", JSON.stringify(await buildDraft()));
          router.push(`/auth/check-email?email=${encodeURIComponent(normalizedEmail)}`);
          return;
        }
      }

      const form = new FormData();
      form.set("payload", JSON.stringify({ businessName, ownerName, phone, instagramHandle }));
      if (logoFile) {
        const upload = await uploadFileDirectly(logoFile, "onboarding");
        if (upload) form.set("logoUpload", JSON.stringify(upload));
        else form.set("logo", logoFile);
      }

      const response = await fetch("/api/onboarding", { method: "POST", body: form });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Failed to create account.");
      localStorage.removeItem("vvs_onb");
      sessionStorage.removeItem("vvs_onb_draft");
      router.push(json.ownerUrl ?? "/design?tour=1");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong.");
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
              className="ob-continue"
              onClick={() => (screen === SCREEN_COUNT - 1 ? void handleSubmit() : go(screen + 1))}
              disabled={isSubmitting || !authChecked}
            >
              {screen === SCREEN_COUNT - 1 ? (isSubmitting ? "Creating your studio…" : "Design a Pendant") : "Continue"}
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
  setOwnerName,
  setPhone,
  setInstagramHandle
}: {
  ownerName: string;
  phone: string;
  instagramHandle: string;
  setOwnerName: (value: string) => void;
  setPhone: (value: string) => void;
  setInstagramHandle: (value: string) => void;
}) {
  return (
    <section className="ob-screen">
      <div className="ob-form-body" onPointerDown={(event) => event.stopPropagation()}>
        <FormHead eyebrow="Get Started" white="First, the" accent="basics." sub="Twenty seconds to set up your studio. We’ll text you the link." />
        <div className="ob-form-stack">
          <FormField label="Your name" placeholder="Jordan Vance" value={ownerName} onChange={setOwnerName} autoComplete="name" />
          <FormField label="Phone number" placeholder="(555) 123-4567" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
          <FormField label="Business Instagram" placeholder="yourstore" value={instagramHandle} onChange={setInstagramHandle} prefix="@" autoComplete="off" />
        </div>
      </div>
    </section>
  );
}

const friction = [
  { key: "Design", body: "Customers can’t picture the piece — so they hesitate, and walk.", icon: "pencil" },
  { key: "Pricing", body: "Back-and-forth quotes stall the deal for days.", icon: "tag" },
  { key: "Communication", body: "Specs get lost between DMs, texts, and the bench.", icon: "chat" }
] as const;

function FrictionIcon({ type }: { type: (typeof friction)[number]["icon"] }) {
  if (type === "pencil") {
    return <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M3 21l3.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L3 21z" stroke={GOLD} strokeWidth="1.6" strokeLinejoin="round" /><path d="M14 6l4 4" stroke={GOLD} strokeWidth="1.6" /></svg>;
  }
  if (type === "tag") {
    return <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M20.5 13.3l-7.2 7.2a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1-.6-1.4V4.5a2 2 0 0 1 2-2H12a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 .1 3.2z" stroke={GOLD} strokeWidth="1.6" strokeLinejoin="round" /><circle cx="8" cy="8" r="1.4" fill={GOLD} /></svg>;
  }
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8 8 0 0 1-11.6 7.1L3 20.5l1.9-6.4A8 8 0 1 1 21 11.5z" stroke={GOLD} strokeWidth="1.6" strokeLinejoin="round" /></svg>;
}

function ScreenProblem() {
  return (
    <section className="ob-screen">
      <div className="ob-body ob-centered-body">
        <Eyebrow>The Problem</Eyebrow>
        <div className="ob-gap-16" />
        <Headline white="Most jewelers lose custom orders to" accent="friction." />
        <div className="ob-friction-list">
          {friction.map((item) => (
            <div className="ob-friction-card" key={item.key}>
              <div className="ob-friction-icon"><FrictionIcon type={item.icon} /></div>
              <div><strong>{item.key}</strong><p>{item.body}</p></div>
            </div>
          ))}
        </div>
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
      <div className="ob-body ob-bottom-body">
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
        <FormHead eyebrow="Create Account" white="Set up your" accent="studio." sub="This is what your customers will see." />
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
  .ob-welcome-fade { position:absolute; inset:0 0 auto; height:64%; background:linear-gradient(180deg,rgba(8,5,3,0) 0%,rgba(8,5,3,0) 44%,rgba(10,6,4,.5) 72%,var(--screen-bg) 100%); }
  .ob-form-head { margin-bottom:24px; }
  .ob-form-head h1 { margin:14px 0 0; font:800 28px/1.1 var(--font-figtree),sans-serif; letter-spacing:-.025em; color:#fff; }
  .ob-form-head .ob-sub { margin-top:10px; font-size:14.5px; }
  .ob-form-stack { display:flex; flex-direction:column; gap:18px; }
  .ob-label { display:block; font-family:var(--font-figtree),sans-serif; }
  .ob-label > span:first-child { display:block; margin-bottom:8px; font-size:12.5px; font-weight:600; letter-spacing:.01em; color:${CREAM}; opacity:.85; }
  .ob-input { width:100%; height:50px; border-radius:14px; background:rgba(237,228,212,.05); border:1px solid rgba(237,228,212,.12); color:#fff; font-size:15.5px; font-weight:500; padding:0 16px; outline:none; transition:.2s; }
  .ob-input::placeholder { color:rgba(237,228,212,.32); font-weight:400; }
  .ob-input:focus, .ob-field:focus-within { border-color:rgba(232,176,106,.7); background:rgba(237,228,212,.08); }
  .ob-field { display:flex; align-items:center; padding-left:14px; border-radius:14px; background:rgba(237,228,212,.05); border:1px solid rgba(237,228,212,.12); transition:.2s; }
  .ob-field b { color:rgba(237,228,212,.45); font-size:15.5px; font-weight:500; margin-right:2px; }
  .ob-input-bare { background:none; border:0; height:48px; padding:0 14px 0 2px; border-radius:0; }
  .ob-input-bare:focus { background:none; }
  .ob-friction-list { display:flex; flex-direction:column; gap:11px; margin-top:26px; }
  .ob-friction-card { display:flex; gap:14px; align-items:flex-start; padding:15px 16px; border-radius:16px; background:rgba(237,228,212,.045); border:1px solid rgba(237,228,212,.09); }
  .ob-friction-icon { flex:0 0 50px; height:50px; border-radius:13px; display:flex; align-items:center; justify-content:center; background:rgba(212,146,74,.14); border:1px solid rgba(232,176,106,.3); }
  .ob-friction-card strong { font:700 15.5px/1.2 var(--font-figtree),sans-serif; color:#fff; }
  .ob-friction-card p { margin:3px 0 0; font:400 13.5px/1.45 var(--font-figtree),sans-serif; color:${DIM}; }
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
  .ob-continue:disabled { opacity:.65; cursor:wait; }
  .ob-error { pointer-events:auto; margin:0; padding:9px 12px; border-radius:12px; border:1px solid rgba(248,113,113,.25); background:rgba(127,29,29,.82); color:#fee2e2; font:600 12px/1.35 var(--font-figtree),sans-serif; text-align:center; }
  @media (max-height:760px) { .ob-form-body { padding-top:78px; } .ob-body { padding-top:92px; padding-bottom:136px; } .ob-nav { bottom:14px; } .ob-account-body { padding-bottom:140px; } }
  @media (min-width:431px) { .ob-app { border-left:1px solid rgba(237,228,212,.08); border-right:1px solid rgba(237,228,212,.08); } }
`;
