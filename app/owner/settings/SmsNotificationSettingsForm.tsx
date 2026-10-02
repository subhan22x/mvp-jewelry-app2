"use client";

import { useState } from "react";
import { SMS_CONSENT_TEXT } from "@/src/lib/sms-consent";

type Props = {
  initialPhone: string;
  initialEnabled: boolean;
  initialConsentAt: string | null;
};

export default function SmsNotificationSettingsForm({ initialPhone, initialEnabled, initialConsentAt }: Props) {
  const [phone, setPhone] = useState(initialPhone);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [consentAt, setConsentAt] = useState(initialConsentAt);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function saveSettings() {
    setError(null);
    setSuccess(null);

    if (enabled && !phone.trim()) {
      setError("Enter the mobile number that should receive notifications.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/owner/sms-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), enabled })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Unable to save SMS notification settings.");

      setPhone(typeof data.smsNotificationPhone === "string" ? data.smsNotificationPhone : phone.trim());
      setEnabled(Boolean(data.smsNotificationsEnabled));
      setConsentAt(typeof data.smsConsentAt === "string" ? data.smsConsentAt : null);
      setSuccess(data.smsNotificationsEnabled ? "SMS notifications are enabled." : "SMS notifications are disabled.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save SMS notification settings.");
    } finally {
      setIsSaving(false);
    }
  }

  const consentDate = consentAt
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(consentAt))
    : null;

  return (
    <section className="rounded-xl border border-white/5 bg-[#17191F] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7bc5f]">Notifications</p>
      <h2 className="mt-3 text-2xl font-bold text-[#e1e2ec]">SMS notifications</h2>
      <p className="mt-2 text-sm leading-6 text-[#c2c6d6]">
        Receive operational alerts when your Grow Jewelry account gets a new customer quote request.
      </p>

      <div className="mt-5 max-w-xl">
        <label className="block text-sm font-semibold text-[#e1e2ec]" htmlFor="sms-notification-phone">
          Mobile number
        </label>
        <input
          id="sms-notification-phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+1 555 123 4567"
          className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#101114] px-4 text-sm text-[#e1e2ec] outline-none transition placeholder:text-[#686c79] focus:border-[#f7bc5f]/70"
        />

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#f7bc5f]"
          />
          <span className="text-xs leading-5 text-[#c2c6d6]">
            {SMS_CONSENT_TEXT}{" "}
            <a className="text-[#f7bc5f] underline underline-offset-2" href="/terms" target="_blank" rel="noreferrer">Terms</a>
            {" · "}
            <a className="text-[#f7bc5f] underline underline-offset-2" href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
          </span>
        </label>

        <p className="mt-3 text-xs text-[#8c909f]">
          Status: <span className={enabled ? "text-emerald-300" : "text-[#c2c6d6]"}>{enabled ? "Enabled" : "Disabled"}</span>
          {consentDate ? ` · Consent recorded ${consentDate}` : " · No consent recorded"}
        </p>

        {error && <p className="mt-3 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-100" role="alert">{error}</p>}
        {success && <p className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100" role="status">{success}</p>}

        <button
          type="button"
          onClick={() => void saveSettings()}
          disabled={isSaving}
          className="mt-4 rounded-xl bg-[#f7bc5f] px-5 py-2.5 text-sm font-bold text-[#17100a] transition hover:bg-[#ffd080] disabled:cursor-wait disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save SMS settings"}
        </button>
      </div>
    </section>
  );
}
