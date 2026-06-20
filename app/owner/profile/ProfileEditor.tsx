"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Country, State } from "country-state-city";
import { uploadFileDirectly } from "@/src/lib/uploads/direct-r2";
import "react-international-phone/style.css";

const PhoneInput = dynamic(
  () => import("react-international-phone").then(module => module.PhoneInput),
  { ssr: false }
);

type ExtraLink = {
  label: string;
  url: string;
};

type ProfileEditorProps = {
  publicUrl: string;
  publicDesignUrl: string;
  displayName: string;
  profileImageUrl: string | null;
  instagramHandle: string;
  phone: string;
  websiteUrl: string;
  city: string;
  state: string;
  country: string;
  extraLinks: ExtraLink[];
};

type InstagramStatus = "idle" | "checking" | "found" | "not_found" | "invalid" | "unknown";
type LinkStatus = "idle" | "checking" | "found" | "not_found" | "invalid" | "unknown";
type ProfileTab = "edit" | "preview";

type ProfileDraft = {
  handle: string;
  publicPhone: string;
  siteUrl: string;
  city: string;
  state: string;
  country: string;
  link1: ExtraLink;
  link2: ExtraLink;
};

function emptyLink(index: number, links: ExtraLink[]) {
  return links[index] ?? { label: "", url: "" };
}

export default function ProfileEditor({
  publicUrl,
  publicDesignUrl,
  displayName,
  profileImageUrl,
  instagramHandle,
  phone,
  websiteUrl,
  city,
  state,
  country,
  extraLinks,
}: ProfileEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<ProfileTab>("edit");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>({
    handle: instagramHandle,
    publicPhone: phone,
    siteUrl: websiteUrl,
    city,
    state,
    country,
    link1: emptyLink(0, extraLinks),
    link2: emptyLink(1, extraLinks),
  });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instagramStatus, setInstagramStatus] = useState<InstagramStatus>(instagramHandle ? "checking" : "idle");
  const websiteStatus = useLinkStatus(draft.siteUrl);
  const link1Status = useLinkStatus(draft.link1.url);
  const link2Status = useLinkStatus(draft.link2.url);
  const countries = useMemo(() => Country.getAllCountries(), []);
  const selectedCountry = useMemo(() => countries.find(item => item.name === draft.country) ?? null, [countries, draft.country]);
  const states = useMemo(() => selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [], [selectedCountry]);

  const previewUrl = useMemo(() => {
    if (!imageFile) return profileImageUrl;
    return URL.createObjectURL(imageFile);
  }, [imageFile, profileImageUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const username = draft.handle.replace(/^@+/, "").trim();
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
        const response = await fetch(`/api/owner/instagram?username=${encodeURIComponent(username)}`, { signal: controller.signal });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          setInstagramStatus("unknown");
          return;
        }
        setInstagramStatus(json.status === "found" ? "found" : json.status === "not_found" ? "not_found" : json.status === "invalid" ? "invalid" : "unknown");
      } catch (err) {
        if (!controller.signal.aborted) setInstagramStatus("unknown");
      }
    }, 650);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [draft.handle]);

  function updateDraft<Key extends keyof ProfileDraft>(key: Key, value: ProfileDraft[Key]) {
    setDraft(current => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const form = new FormData();
    if (imageFile) {
      const upload = await uploadFileDirectly(imageFile, "owner-profile");
      if (upload) form.set("profileImageUpload", JSON.stringify(upload));
      else form.set("profileImage", imageFile);
    }
    form.set("instagramHandle", draft.handle);
    form.set("phone", draft.publicPhone);
    form.set("websiteUrl", draft.siteUrl);
    form.set("city", draft.city);
    form.set("state", draft.state);
    form.set("country", draft.country);
    form.set("extraLink1Label", draft.link1.label);
    form.set("extraLink1Url", draft.link1.url);
    form.set("extraLink2Label", draft.link2.label);
    form.set("extraLink2Url", draft.link2.url);

    const response = await fetch("/api/owner/profile", { method: "PATCH", body: form });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(json.error ?? "Unable to save profile.");
      return;
    }

    setStatus("Profile saved.");
    setImageFile(null);
    startTransition(() => router.refresh());
  }

  return (
    <section className="space-y-4">
      <PublicLinkCard publicUrl={publicUrl} publicDesignUrl={publicDesignUrl} />

      <div className="grid rounded-full bg-[#101114] p-1 text-sm font-semibold text-[#8c909f] ring-1 ring-white/10 lg:hidden">
        <div className="grid grid-cols-2">
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`rounded-full px-4 py-2.5 ${activeTab === "edit" ? "bg-[#17191F] text-[#e1e2ec]" : ""}`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`rounded-full px-4 py-2.5 ${activeTab === "preview" ? "bg-[#17191F] text-[#e1e2ec]" : ""}`}
          >
            Preview
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className={activeTab === "preview" ? "block" : "hidden lg:block"}>
          <ProfilePreview publicUrl={publicUrl} displayName={displayName} imageUrl={previewUrl} draft={draft} />
        </div>

        <form onSubmit={submit} className={activeTab === "edit" ? "rounded-xl border border-white/5 bg-[#17191F] p-5" : "hidden rounded-xl border border-white/5 bg-[#17191F] p-5 lg:block"}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7bc5f]">Profile editor</p>
            <h2 className="mt-3 text-2xl font-bold">Public links</h2>
          </div>
          <a href={publicUrl} className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#c2c6d6] hover:bg-white/10">
            View public page
          </a>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">Profile picture</span>
            <input
              type="file"
              accept="image/*"
              onChange={event => setImageFile(event.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#101114] px-3 py-3 text-sm text-[#c2c6d6] file:mr-3 file:rounded-full file:border-0 file:bg-[#f7bc5f] file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-black"
            />
          </label>
          <InstagramField label="Instagram handle" value={draft.handle} onChange={value => updateDraft("handle", value)} placeholder="icekinglondon" status={instagramStatus} />
          <PhoneField label="Public phone number" value={draft.publicPhone} onChange={value => updateDraft("publicPhone", value)} />
          <LinkUrlField label="Website" value={draft.siteUrl} onChange={value => updateDraft("siteUrl", value)} placeholder="https://yourstore.com" status={websiteStatus} />

          <div className="sm:col-span-2 border-t border-white/10 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f7bc5f]">Location</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="City" value={draft.city} onChange={value => updateDraft("city", value)} placeholder="London" />
              <CountryField
                label="Country"
                value={draft.country}
                countries={countries}
                onChange={value => setDraft(current => ({ ...current, country: value, state: "" }))}
              />
              {states.length > 0 && (
                <StateField label="State / Region" value={draft.state} states={states} onChange={value => updateDraft("state", value)} />
              )}
            </div>
          </div>

          <div className="sm:col-span-2 border-t border-white/10 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f7bc5f]">Links</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Extra link 1 label" value={draft.link1.label} onChange={value => updateDraft("link1", { ...draft.link1, label: value })} placeholder="Financing" />
              <LinkUrlField label="Extra link 1 URL" value={draft.link1.url} onChange={value => updateDraft("link1", { ...draft.link1, url: value })} placeholder="https://..." status={link1Status} />
              <Field label="Extra link 2 label" value={draft.link2.label} onChange={value => updateDraft("link2", { ...draft.link2, label: value })} placeholder="Reviews" />
              <LinkUrlField label="Extra link 2 URL" value={draft.link2.url} onChange={value => updateDraft("link2", { ...draft.link2, url: value })} placeholder="https://..." status={link2Status} />
            </div>
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
        {status && <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{status}</p>}

        <button disabled={isPending} className="mt-5 rounded-full bg-[#f7bc5f] px-5 py-3 text-sm font-bold text-black hover:bg-[#ffd88a] disabled:opacity-60">
          {isPending ? "Saving..." : "Save profile"}
        </button>
        </form>
      </div>
    </section>
  );
}

function normalizeCandidateUrl(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
}

function normalizeHandle(value: string) {
  return value.replace(/^@+/, "").trim();
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function formatAddress(draft: ProfileDraft) {
  return [draft.city, draft.state, draft.country].filter(Boolean).join(", ");
}

function visibleExtraLinks(draft: ProfileDraft) {
  return [draft.link1, draft.link2].filter(link => link.label.trim() && link.url.trim());
}

function faviconUrl(value: string) {
  const url = normalizeCandidateUrl(value);
  if (!url) return null;
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url.origin)}`;
}

function PublicLinkCard({ publicUrl, publicDesignUrl }: { publicUrl: string; publicDesignUrl: string }) {
  async function copyLink(path: string) {
    await navigator.clipboard?.writeText(window.location.origin + path);
  }

  async function shareLink(path: string, title: string) {
    const url = window.location.origin + path;
    if (navigator.share) {
      await navigator.share({ title, url });
      return;
    }
    await navigator.clipboard?.writeText(url);
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-[#dec47e]/20 bg-[#17191F] p-5 shadow-2xl shadow-black/20 md:grid-cols-2">
      <div className="rounded-xl border border-white/10 bg-[#101114] p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8c909f]">Public profile link</p>
        <p className="mt-3 break-all text-lg font-black text-[#f7bc5f]">{publicUrl}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => copyLink(publicUrl)} className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-[#e1e2ec] hover:bg-white/10">Copy</button>
          <button type="button" onClick={() => shareLink(publicUrl, "Public profile")} className="rounded-full border border-white/10 px-3 py-2 text-sm font-semibold text-[#e1e2ec] hover:bg-white/10">Share</button>
          <a href={publicUrl} className="rounded-full border border-white/10 px-3 py-2 text-center text-sm font-semibold text-[#e1e2ec] hover:bg-white/10">View</a>
        </div>
      </div>

      <div className="rounded-xl border border-[#f7bc5f]/30 bg-[#211914] p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#f7bc5f]">QR design link</p>
        <p className="mt-3 break-all text-lg font-black text-[#ffd88a]">{publicDesignUrl}</p>
        <p className="mt-2 text-xs leading-5 text-[#c2c6d6]">Use this URL for QR codes. Customers can design without signing in and usage stays tied to this account.</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => copyLink(publicDesignUrl)} className="rounded-full border border-[#f7bc5f]/30 px-3 py-2 text-sm font-semibold text-[#ffe5a8] hover:bg-[#f7bc5f]/10">Copy</button>
          <button type="button" onClick={() => shareLink(publicDesignUrl, "Design custom jewelry")} className="rounded-full border border-[#f7bc5f]/30 px-3 py-2 text-sm font-semibold text-[#ffe5a8] hover:bg-[#f7bc5f]/10">Share</button>
          <a href={publicDesignUrl} className="rounded-full border border-[#f7bc5f]/30 px-3 py-2 text-center text-sm font-semibold text-[#ffe5a8] hover:bg-[#f7bc5f]/10">Open</a>
        </div>
      </div>
    </div>
  );
}

function ProfilePreview({ publicUrl, displayName, imageUrl, draft }: { publicUrl: string; displayName: string; imageUrl: string | null; draft: ProfileDraft }) {
  const handle = normalizeHandle(draft.handle);
  const address = formatAddress(draft);
  const phone = draft.publicPhone.trim();
  const phoneTarget = normalizePhone(phone);
  const instagramHref = handle ? `https://instagram.com/${handle}` : null;
  const messageHref = phoneTarget ? `sms:${phoneTarget}` : "#";
  const extraLinks = visibleExtraLinks(draft);

  return (
    <div className="overflow-hidden rounded-2xl border border-[rgba(237,228,212,.08)] bg-[#050504] p-5 text-[#ede4d4] shadow-2xl shadow-black/30 lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#ebb467]">Live preview</p>
        <a href={publicUrl} className="rounded-full border border-[rgba(237,228,212,.12)] px-3 py-1.5 text-xs font-semibold text-[#91877b] hover:text-[#ede4d4]">Public page</a>
      </div>

      <div className="mt-5">
        <div className="h-24 w-24 overflow-hidden rounded-[1.7rem] border border-[rgba(237,228,212,.12)] bg-[#15120d]">
          {imageUrl ? (
            <img src={imageUrl} alt={`${displayName} profile preview`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-black text-[#ebb467]">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        <h2 className="mt-4 text-2xl font-black tracking-normal">{displayName}</h2>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#91877b]">
          {handle && (
            <a href={instagramHref ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
              <InstagramMiniIcon />
              @{handle}
            </a>
          )}
          {phone && <span className="inline-flex items-center gap-1.5"><PhoneMiniIcon />{phone}</span>}
          {address && <span className="inline-flex items-center gap-1.5"><LocationMiniIcon />{address}</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-[rgba(212,146,74,.16)] px-3 py-1 text-xs font-bold text-[#ebb467]">VVS Verified</span>
          <span className="rounded-full bg-[rgba(237,228,212,.08)] px-3 py-1 text-xs font-bold text-[#ede4d4]">Taking Orders</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <PreviewButton href={`${publicUrl}/review`} label="Reviews" />
        <PreviewButton href={messageHref} label="Message" variant="gold" />
        {instagramHref && <PreviewButton href={instagramHref} label="Instagram" external />}
        <PreviewButton href="/name" label="Design Custom" />
      </div>

      {extraLinks.length > 0 && (
        <div className="mt-3 grid gap-2">
          {extraLinks.map(link => (
            <PreviewExtraLink key={`${link.label}-${link.url}`} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}

function PreviewExtraLink({ link }: { link: ExtraLink }) {
  const href = normalizeCandidateUrl(link.url)?.toString() ?? "#";
  const iconUrl = faviconUrl(link.url);
  const [showFallback, setShowFallback] = useState(!iconUrl);

  return (
    <a href={href} target="_blank" rel="noreferrer" className="grid min-h-11 grid-cols-[1.5rem_1fr_1.5rem] items-center rounded-full border border-[rgba(237,228,212,.24)] bg-[#120f0c] px-4 text-sm font-semibold text-[#ede4d4] shadow-[inset_0_0_0_1px_rgba(235,180,103,.08)] hover:border-[rgba(235,180,103,.52)]">
      <span className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full">
        {!showFallback && iconUrl ? (
          <img src={iconUrl} alt="" className="h-4 w-4" referrerPolicy="no-referrer" onError={() => setShowFallback(true)} />
        ) : (
          <GlobeMiniIcon />
        )}
      </span>
      <span className="truncate text-center">{link.label}</span>
      <span aria-hidden />
    </a>
  );
}

function PreviewButton({ href, label, external = false, variant = "default" }: { href: string; label: string; external?: boolean; variant?: "default" | "gold" }) {
  const className = variant === "gold"
    ? "flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(165deg,#ebb467,#d4924a)] px-4 text-center text-sm font-semibold text-[#1b1006] shadow-[0_10px_24px_-12px_rgba(212,146,74,.8)]"
    : "flex min-h-12 items-center justify-center rounded-full bg-[#221d17] px-4 text-center text-sm font-semibold text-[#f4eadc] ring-1 ring-[rgba(237,228,212,.14)] hover:bg-[#2a231b] hover:ring-[rgba(235,180,103,.36)]";

  return (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className={className}>
      {label}
    </a>
  );
}

function InstagramMiniIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#d4924a]">
      <rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.7" cy="7.3" r="1" fill="currentColor" />
    </svg>
  );
}

function GlobeMiniIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-[#d4924a]">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M3.8 12h16.4M12 3.5c2.2 2.3 3.4 5.1 3.4 8.5S14.2 18.2 12 20.5C9.8 18.2 8.6 15.4 8.6 12S9.8 5.8 12 3.5Z" />
    </svg>
  );
}

function PhoneMiniIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#d4924a]">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M6.6 3.8 9.2 3l2 4.8-1.7 1.1c.9 1.9 2.4 3.4 4.5 4.6l1.2-1.7 4.8 2.1-.8 2.7c-.3 1-1.2 1.6-2.2 1.5C9.5 17.5 4.8 12.8 4.2 5.3c-.1-1 .5-1.9 1.4-2.2Z" />
    </svg>
  );
}

function LocationMiniIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#d4924a]">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function useLinkStatus(url: string): LinkStatus {
  const [status, setStatus] = useState<LinkStatus>(url ? "checking" : "idle");

  useEffect(() => {
    const candidate = normalizeCandidateUrl(url);
    if (!url.trim()) {
      setStatus("idle");
      return;
    }
    if (!candidate) {
      setStatus("invalid");
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setStatus("checking");
      try {
        const response = await fetch(`/api/owner/link?url=${encodeURIComponent(url)}`, { signal: controller.signal });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          setStatus("unknown");
          return;
        }
        setStatus(json.status === "found" ? "found" : json.status === "not_found" ? "not_found" : json.status === "invalid" ? "invalid" : "unknown");
      } catch {
        if (!controller.signal.aborted) setStatus("unknown");
      }
    }, 700);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [url]);

  return status;
}

function PhoneField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">{label}</span>
      <PhoneInput
        inputProps={{ autoComplete: "tel" }}
        defaultCountry="us"
        value={value}
        onChange={onChange}
        style={
          {
            "--react-international-phone-background-color": "#101114",
            "--react-international-phone-border-color": "rgba(255,255,255,0.1)",
            "--react-international-phone-text-color": "#e1e2ec",
            "--react-international-phone-selected-dropdown-item-background-color": "rgba(247,188,95,0.14)",
            "--react-international-phone-dropdown-item-background-color": "#101114",
            "--react-international-phone-country-selector-background-color-hover": "rgba(247,188,95,0.14)",
            "--react-international-phone-flag-width": "22px",
            "--react-international-phone-flag-height": "16px",
            width: "100%",
            height: "48px",
            marginTop: "0.5rem",
            borderRadius: "0.5rem",
          } as React.CSSProperties
        }
      />
    </label>
  );
}

function InstagramField({ label, value, onChange, placeholder, status }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; status: InstagramStatus }) {
  const statusText = {
    idle: "",
    checking: "Checking...",
    found: "Username found",
    not_found: "Username not found",
    invalid: "Invalid username",
    unknown: "Could not verify",
  }[status];
  const colorClass = status === "found" ? "text-[#E1306C]" : status === "checking" ? "text-[#f7bc5f]" : "text-[#687080]";

  return (
    <label>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">{label}</span>
        {statusText && <span className="text-[11px] font-semibold text-[#8c909f]">{statusText}</span>}
      </div>
      <div className="mt-2 flex h-12 items-center rounded-lg border border-white/10 bg-[#101114] focus-within:border-[#f7bc5f]">
        <span className={`flex h-full w-12 items-center justify-center ${colorClass}`}>
          <InstagramIcon active={status === "found"} />
        </span>
        <input
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 rounded-r-lg bg-transparent pr-3 text-sm text-[#e1e2ec] outline-none placeholder:text-white/30"
        />
      </div>
    </label>
  );
}

function LinkUrlField({ label, value, onChange, placeholder, status }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; status: LinkStatus }) {
  const statusText = {
    idle: "",
    checking: "Checking...",
    found: "URL works",
    not_found: "Not found",
    invalid: "Invalid URL",
    unknown: "Could not verify",
  }[status];
  const colorClass = status === "found" ? "text-[#f7bc5f] drop-shadow-[0_0_8px_rgba(247,188,95,0.85)]" : status === "checking" ? "text-[#f7bc5f]" : "text-[#687080]";

  return (
    <label>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">{label}</span>
        {statusText && <span className="text-[11px] font-semibold text-[#8c909f]">{statusText}</span>}
      </div>
      <div className="mt-2 flex h-12 items-center rounded-lg border border-white/10 bg-[#101114] focus-within:border-[#f7bc5f]">
        <span className={`flex h-full w-12 items-center justify-center ${colorClass}`}>
          <GlobeIcon active={status === "found"} />
        </span>
        <input
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 rounded-r-lg bg-transparent pr-3 text-sm text-[#e1e2ec] outline-none placeholder:text-white/30"
        />
      </div>
    </label>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">{label}</span>
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#101114] px-3 text-sm text-[#e1e2ec] outline-none placeholder:text-white/30 focus:border-[#f7bc5f]"
      />
    </label>
  );
}

function CountryField({
  label,
  value,
  countries,
  onChange,
}: {
  label: string;
  value: string;
  countries: ReturnType<typeof Country.getAllCountries>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#101114] px-3 text-sm text-[#e1e2ec] outline-none focus:border-[#f7bc5f]"
      >
        <option value="">Select country</option>
        {countries.map(country => (
          <option key={country.isoCode} value={country.name}>{country.name}</option>
        ))}
      </select>
    </label>
  );
}

function StateField({
  label,
  value,
  states,
  onChange,
}: {
  label: string;
  value: string;
  states: ReturnType<typeof State.getStatesOfCountry>;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#101114] px-3 text-sm text-[#e1e2ec] outline-none focus:border-[#f7bc5f]"
      >
        <option value="">Select state / region</option>
        {states.map(state => (
          <option key={state.isoCode} value={state.name}>{state.name}</option>
        ))}
      </select>
    </label>
  );
}

function InstagramIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <defs>
        <linearGradient id="instagram-gradient" x1="2" x2="22" y1="22" y2="2">
          <stop offset="0%" stopColor="#FEDA75" />
          <stop offset="35%" stopColor="#FA7E1E" />
          <stop offset="65%" stopColor="#D62976" />
          <stop offset="100%" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke={active ? "url(#instagram-gradient)" : "currentColor"} strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.5" fill="none" stroke={active ? "url(#instagram-gradient)" : "currentColor"} strokeWidth="1.8" />
      <circle cx="16.8" cy="7.2" r="1" fill={active ? "#D62976" : "currentColor"} />
    </svg>
  );
}

function GlobeIcon({ active }: { active: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <circle cx="12" cy="12" r="8.5" fill={active ? "rgba(247,188,95,0.12)" : "none"} stroke="currentColor" strokeWidth="1.8" />
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M3.8 12h16.4M12 3.5c2.2 2.3 3.4 5.1 3.4 8.5S14.2 18.2 12 20.5C9.8 18.2 8.6 15.4 8.6 12S9.8 5.8 12 3.5Z" />
    </svg>
  );
}
