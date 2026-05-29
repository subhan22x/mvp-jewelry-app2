"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
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
  displayName: string;
  headline: string;
  profileImageUrl: string | null;
  instagramHandle: string;
  phone: string;
  websiteUrl: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  extraLinks: ExtraLink[];
};

type InstagramStatus = "idle" | "checking" | "found" | "not_found" | "invalid" | "unknown";
type LinkStatus = "idle" | "checking" | "found" | "not_found" | "invalid" | "unknown";

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "France",
  "Germany",
  "Italy",
  "Spain",
  "Netherlands",
  "Switzerland",
  "India",
  "Pakistan",
  "Other",
];

function emptyLink(index: number, links: ExtraLink[]) {
  return links[index] ?? { label: "", url: "" };
}

export default function ProfileEditor({
  publicUrl,
  displayName,
  headline,
  profileImageUrl,
  instagramHandle,
  phone,
  websiteUrl,
  addressLine1,
  addressLine2,
  city,
  state,
  postalCode,
  country,
  extraLinks,
}: ProfileEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [handle, setHandle] = useState(instagramHandle);
  const [publicPhone, setPublicPhone] = useState(phone);
  const [siteUrl, setSiteUrl] = useState(websiteUrl);
  const [profileAddressLine1, setProfileAddressLine1] = useState(addressLine1);
  const [profileAddressLine2, setProfileAddressLine2] = useState(addressLine2);
  const [profileCity, setProfileCity] = useState(city);
  const [profileState, setProfileState] = useState(state);
  const [profilePostalCode, setProfilePostalCode] = useState(postalCode);
  const [profileCountry, setProfileCountry] = useState(country);
  const [link1, setLink1] = useState(emptyLink(0, extraLinks));
  const [link2, setLink2] = useState(emptyLink(1, extraLinks));
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instagramStatus, setInstagramStatus] = useState<InstagramStatus>(instagramHandle ? "checking" : "idle");
  const websiteStatus = useLinkStatus(siteUrl);
  const link1Status = useLinkStatus(link1.url);
  const link2Status = useLinkStatus(link2.url);

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
    const username = handle.replace(/^@+/, "").trim();
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
  }, [handle]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const form = new FormData();
    if (imageFile) form.set("profileImage", imageFile);
    form.set("instagramHandle", handle);
    form.set("phone", publicPhone);
    form.set("websiteUrl", siteUrl);
    form.set("addressLine1", profileAddressLine1);
    form.set("addressLine2", profileAddressLine2);
    form.set("city", profileCity);
    form.set("state", profileState);
    form.set("postalCode", profilePostalCode);
    form.set("country", profileCountry);
    form.set("extraLink1Label", link1.label);
    form.set("extraLink1Url", link1.url);
    form.set("extraLink2Label", link2.label);
    form.set("extraLink2Url", link2.url);

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
    <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#17191F]">
        <div className="p-4">
          <div className="h-24 w-24 overflow-hidden rounded-2xl border border-white/10 bg-[#272a31]">
            {previewUrl ? <img src={previewUrl} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <h2 className="mt-3 text-xl font-bold">{displayName}</h2>
          <p className="mt-1 text-sm text-[#8c909f]">@{handle || "instagram"}</p>
          <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">{headline || "Public storefront profile shown at your bio link."}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
            <span className="rounded-lg bg-[#101114] px-3 py-2 text-center">Message</span>
            {handle && <span className="rounded-lg bg-[#101114] px-3 py-2 text-center">Instagram</span>}
            {siteUrl && <span className="rounded-lg bg-[#101114] px-3 py-2 text-center">Website</span>}
            <span className="rounded-lg bg-[#101114] px-3 py-2 text-center">Design Custom</span>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="rounded-xl border border-white/5 bg-[#17191F] p-5">
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
          <InstagramField label="Instagram handle" value={handle} onChange={setHandle} placeholder="icekinglondon" status={instagramStatus} />
          <PhoneField label="Public phone number" value={publicPhone} onChange={setPublicPhone} />
          <LinkUrlField label="Website" value={siteUrl} onChange={setSiteUrl} placeholder="https://yourstore.com" status={websiteStatus} />

          <div className="sm:col-span-2 border-t border-white/10 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f7bc5f]">Address</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Street address" value={profileAddressLine1} onChange={setProfileAddressLine1} placeholder="123 Main Street" />
              <Field label="Apt, suite, unit" value={profileAddressLine2} onChange={setProfileAddressLine2} placeholder="Suite 4B" />
              <Field label="City" value={profileCity} onChange={setProfileCity} placeholder="London" />
              <Field label="State / Region" value={profileState} onChange={setProfileState} placeholder="Texas" />
              <Field label="Postal code" value={profilePostalCode} onChange={setProfilePostalCode} placeholder="77002" />
              <CountryField label="Country" value={profileCountry} onChange={setProfileCountry} />
            </div>
          </div>

          <div className="sm:col-span-2 border-t border-white/10 pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f7bc5f]">Links</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Extra link 1 label" value={link1.label} onChange={value => setLink1(link => ({ ...link, label: value }))} placeholder="Financing" />
              <LinkUrlField label="Extra link 1 URL" value={link1.url} onChange={value => setLink1(link => ({ ...link, url: value }))} placeholder="https://..." status={link1Status} />
              <Field label="Extra link 2 label" value={link2.label} onChange={value => setLink2(link => ({ ...link, label: value }))} placeholder="Reviews" />
              <LinkUrlField label="Extra link 2 URL" value={link2.url} onChange={value => setLink2(link => ({ ...link, url: value }))} placeholder="https://..." status={link2Status} />
            </div>
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
        {status && <p className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">{status}</p>}

        <button disabled={isPending} className="mt-5 rounded-full bg-[#f7bc5f] px-5 py-3 text-sm font-bold text-black hover:bg-[#ffd88a] disabled:opacity-60">
          {isPending ? "Saving..." : "Save profile"}
        </button>
      </form>
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

function CountryField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-lg border border-white/10 bg-[#101114] px-3 text-sm text-[#e1e2ec] outline-none focus:border-[#f7bc5f]"
      >
        <option value="">Select country</option>
        {COUNTRIES.map(country => (
          <option key={country} value={country}>{country}</option>
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
