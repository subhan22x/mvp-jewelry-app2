"use client";

import { useState } from "react";

export default function NotificationSettingsForm({ initialEnabled, initialEmailOverride, loginEmail }: {
  initialEnabled: boolean; initialEmailOverride: string | null; loginEmail: string | null;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [email, setEmail] = useState(initialEmailOverride ?? loginEmail ?? "");
  const [useLoginEmail, setUseLoginEmail] = useState(initialEmailOverride === null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/owner/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled, emailOverride: useLoginEmail ? null : email.trim(), smsEnabled: false }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save notification settings.");
      setEnabled(data.enabled); setEmail(data.email ?? ""); setUseLoginEmail(data.emailOverride === null);
      setMessage("Notification settings saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save notification settings."); }
    finally { setSaving(false); }
  }

  return <section className="rounded-xl border border-white/5 bg-[#17191F] p-5 sm:p-6">
    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7bc5f]">Notifications</p>
    <h2 className="mt-3 text-2xl font-bold text-[#e1e2ec]">Customer activity</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c2c6d6]">Get an email when a customer creates a design or sends a quote request through your jewelry designer.</p>
    <form onSubmit={save} className="mt-6 max-w-2xl space-y-5">
      <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 p-4">
        <span><span className="block text-sm font-semibold text-[#e1e2ec]">Customer activity notifications</span><span className="mt-1 block text-xs text-[#8c909f]">One notification per new customer request.</span></span>
        <input aria-label="Customer activity notifications" type="checkbox" role="switch" checked={enabled} disabled={saving} onChange={e => { setEnabled(e.target.checked); setMessage(null); }} className="h-5 w-5 shrink-0 accent-[#f7bc5f]" />
      </label>
      <fieldset disabled={!enabled || saving} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-[#e1e2ec]">Send notifications by</legend>
        <label className={`flex items-center gap-3 rounded-xl border border-[#f7bc5f]/40 bg-[#f7bc5f]/5 p-4 ${!enabled ? "opacity-50" : ""}`}><input type="checkbox" checked onChange={() => {}} aria-label="Email notifications" className="h-4 w-4 accent-[#f7bc5f]" /><span className="text-sm font-semibold text-[#e1e2ec]">Email</span></label>
        <label className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-white/5 bg-black/10 p-4 text-[#686c79]"><input type="checkbox" disabled checked={false} readOnly aria-label="SMS notifications" className="h-4 w-4" /><span className="text-sm font-semibold">SMS</span><span className="ml-auto rounded-full border border-white/10 px-2 py-1 text-[10px]">Coming soon</span></label>
      </fieldset>
      <div>
        <label htmlFor="notification-email" className="block text-sm font-semibold text-[#e1e2ec]">Notification email</label>
        <input id="notification-email" type="email" maxLength={254} required={enabled} value={email} disabled={saving} onChange={e => { setEmail(e.target.value); setUseLoginEmail(false); setMessage(null); }} autoComplete="email" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#101114] px-4 text-sm text-[#e1e2ec] outline-none focus:border-[#f7bc5f]/70" />
        <p className="mt-2 text-xs leading-5 text-[#8c909f]">Defaults to your login email. Changing this won't change your login.</p>
        {loginEmail && !useLoginEmail && <button type="button" disabled={saving} onClick={() => { setEmail(loginEmail); setUseLoginEmail(true); setMessage(null); }} className="mt-2 text-xs font-semibold text-[#f7bc5f] underline underline-offset-4">Use login email</button>}
      </div>
      <p className="text-xs leading-5 text-[#8c909f]">You'll receive one email once a design and customer contact details are available, even if the customer hasn't chosen a favorite.</p>
      {error && <p role="alert" className="rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p>}
      {message && <p role="status" className="text-sm text-emerald-300">{message}</p>}
      <button type="submit" disabled={saving} className="rounded-xl bg-[#f7bc5f] px-5 py-3 text-sm font-bold text-[#17100a] hover:bg-[#ffd080] disabled:opacity-60">{saving ? "Saving…" : "Save notification settings"}</button>
    </form>
  </section>;
}
