"use client";

import { useMemo, useState } from "react";

type Account = { id: string; name: string; slug: string };
type Exception = {
  id: string;
  accountId: string;
  reason: string;
  createdByUserId: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedByUserId: string | null;
  account: Account & { status: string };
};

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value)) : "Never";
}

function isActive(exception: Exception, evaluatedAt: Date) {
  return !exception.revokedAt && (!exception.expiresAt || new Date(exception.expiresAt) > evaluatedAt);
}

export default function AccessExceptionsManager({ accounts, initialExceptions, evaluatedAt }: { accounts: Account[]; initialExceptions: Exception[]; evaluatedAt: string }) {
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const evaluationTime = useMemo(() => new Date(evaluatedAt), [evaluatedAt]);
  const activeAccountIds = useMemo(() => new Set(exceptions.filter(exception => isActive(exception, evaluationTime)).map(exception => exception.accountId)), [exceptions, evaluationTime]);

  async function createException(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/admin/access-exceptions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId, reason, expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null }),
    });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(payload.error ?? "Unable to grant access.");
    const account = accounts.find(candidate => candidate.id === payload.exception.accountId);
    if (account) setExceptions(current => [{ ...payload.exception, account: { ...account, status: "active" } }, ...current]);
    setReason("");
    setExpiresAt("");
    setMessage("Complimentary access granted.");
  }

  async function revokeException(id: string) {
    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/admin/access-exceptions/${id}`, { method: "PATCH" });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(payload.error ?? "Unable to revoke access.");
    setExceptions(current => current.map(exception => exception.id === id ? { ...exception, ...payload.exception, revokedAt: payload.exception.revokedAt } : exception));
    setMessage("Complimentary access revoked.");
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-4 md:px-6">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D1B873]">SaaS administration</p>
        <h1 className="mt-2 text-3xl font-black text-white">Complimentary access</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#c2c6d6]">Grant a revocable, account-level billing exception without changing Stripe subscriptions or trial history.</p>
      </div>

      <form onSubmit={createException} className="grid gap-4 rounded-2xl border border-white/10 bg-[#17191F] p-5 md:grid-cols-2">
        <label className="text-sm font-semibold text-[#e1e2ec]">Account
          <select value={accountId} onChange={event => setAccountId(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-[#101114] px-3 py-2 text-white" required>
            {accounts.map(account => <option key={account.id} value={account.id} disabled={activeAccountIds.has(account.id)}>{account.name} ({account.slug}){activeAccountIds.has(account.id) ? " — active exception" : ""}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-[#e1e2ec]">Optional expiry
          <input type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} className="mt-2 w-full rounded-lg border border-white/15 bg-[#101114] px-3 py-2 text-white" />
        </label>
        <label className="md:col-span-2 text-sm font-semibold text-[#e1e2ec]">Reason (required)
          <textarea value={reason} onChange={event => setReason(event.target.value)} minLength={3} maxLength={500} required className="mt-2 min-h-24 w-full rounded-lg border border-white/15 bg-[#101114] px-3 py-2 text-white" placeholder="e.g. Development account for staging and support" />
        </label>
        <div className="md:col-span-2 flex items-center justify-between gap-4"><p className="text-xs text-[#8c909f]">This does not alter Stripe billing data.</p><button disabled={saving || !accountId} className="rounded-lg bg-[#D1B873] px-4 py-2 text-sm font-bold text-[#17191F] disabled:opacity-60">Grant access</button></div>
      </form>
      {message && <p role="status" className="mt-4 text-sm text-[#D1B873]">{message}</p>}

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#17191F]">
        <div className="border-b border-white/10 px-5 py-4"><h2 className="font-bold text-white">Access exception history</h2></div>
        {exceptions.length === 0 ? <p className="px-5 py-8 text-sm text-[#8c909f]">No complimentary access exceptions have been created.</p> : <div className="divide-y divide-white/10">{exceptions.map(exception => <div key={exception.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold text-white">{exception.account.name} <span className="text-sm font-normal text-[#8c909f]">({exception.account.slug})</span></p><p className="mt-1 text-sm text-[#c2c6d6]">{exception.reason}</p><p className="mt-2 text-xs text-[#8c909f]">Granted {formatDate(exception.createdAt)} · Expires {formatDate(exception.expiresAt)} · {isActive(exception, evaluationTime) ? "Active" : exception.revokedAt ? `Revoked ${formatDate(exception.revokedAt)}` : "Expired"}</p></div>{!exception.revokedAt && <button type="button" disabled={saving} onClick={() => revokeException(exception.id)} className="rounded-lg border border-red-400/40 px-3 py-2 text-sm font-semibold text-red-200 disabled:opacity-60">Revoke</button>}</div>)}</div>}
      </div>
    </section>
  );
}
