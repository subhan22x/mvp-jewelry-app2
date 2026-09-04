"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

type Kit = {
  id: string;
  displayCode: string;
  publicToken: string;
  status: string;
  assignedAt: string | null;
  deployedAt: string | null;
  createdAt: string;
  batch: { code: string; label: string; printTemplateVersion: string };
  account: { id: string; name: string; slug: string } | null;
};

type Account = { id: string; name: string; slug: string };

function messageFromResponse(payload: unknown, fallback: string) {
  return typeof payload === "object" && payload && "error" in payload && typeof payload.error === "string"
    ? payload.error
    : fallback;
}

function kitUrl(token: string) {
  return `${window.location.origin}/scan/${token}`;
}

export default function QrKitDashboard({ initialKits, counts }: { initialKits: Kit[]; counts: Record<string, number> }) {
  const [kits, setKits] = useState(initialKits);
  const [statusCounts, setStatusCounts] = useState(counts);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Record<string, string>>({});

  useEffect(() => {
    if (search.trim().length < 2) {
      setAccounts([]);
      return;
    }
    const timeout = window.setTimeout(async () => {
      const response = await fetch(`/api/admin/accounts?q=${encodeURIComponent(search)}`);
      const payload = await response.json().catch(() => ({ items: [] }));
      if (response.ok) setAccounts(Array.isArray(payload.items) ? payload.items : []);
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const summary = useMemo(() => ["available", "assigned", "suspended", "lost", "retired"].map(status => ({ status, count: statusCounts[status] ?? 0 })), [statusCounts]);

  async function createBatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setCreating(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/qr-kits/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.get("code"),
          label: form.get("label"),
          printTemplateVersion: form.get("printTemplateVersion"),
          quantity: Number(form.get("quantity"))
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFromResponse(payload, "Unable to create QR kit batch."));
      setKits(current => [...payload.kits.map((kit: Kit) => ({ ...kit, account: null, batch: payload.batch, assignedAt: null, deployedAt: null, createdAt: kit.createdAt })), ...current]);
      setStatusCounts(current => ({ ...current, available: (current.available ?? 0) + payload.kits.length }));
      event.currentTarget.reset();
      setNotice(`Created ${payload.kits.length} QR kits. Every code is currently unassigned.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to create QR kit batch.");
    } finally {
      setCreating(false);
    }
  }

  async function assign(kitId: string) {
    const accountId = selectedAccount[kitId];
    if (!accountId) return setNotice("Search for and select an Account before assignment.");
    const response = await fetch(`/api/admin/qr-kits/${kitId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId })
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return setNotice(messageFromResponse(payload, "Unable to assign QR kit."));
    const account = accounts.find(item => item.id === accountId) ?? null;
    setKits(current => current.map(kit => kit.id === kitId ? { ...kit, ...payload.kit, account } : kit));
    setStatusCounts(current => ({
      ...current,
      available: Math.max(0, (current.available ?? 0) - 1),
      assigned: (current.assigned ?? 0) + 1
    }));
    setNotice(`Assigned ${payload.kit.displayCode}. Test the physical QR before leaving it with the store.`);
  }

  async function downloadQr(kit: Kit) {
    try {
      const dataUrl = await QRCode.toDataURL(kitUrl(kit.publicToken), {
        width: 2048,
        margin: 4,
        errorCorrectionLevel: "M",
        color: { dark: "#101114", light: "#ffffff" }
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${kit.displayCode}.png`;
      link.click();
    } catch {
      setNotice("QR generation failed. Please retry the download.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-4 pb-16 md:p-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#f7bc5f]">Physical inventory</p>
        <h2 className="mt-2 text-3xl font-bold">QR Attribution</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c2c6d6]">Create permanent, numbered displays. Assign a display once to an Account, then test the same QR before it reaches the store floor.</p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {summary.map(item => <div key={item.status} className="rounded-xl border border-white/10 bg-[#17191F] p-4"><p className="text-xs uppercase tracking-[0.16em] text-[#8c909f]">{item.status}</p><p className="mt-2 text-2xl font-bold">{item.count}</p></div>)}
      </section>

      <section className="mt-8 rounded-2xl border border-[#D1B873]/25 bg-[#17191F] p-5">
        <h3 className="text-lg font-bold">Create a print batch</h3>
        <form onSubmit={createBatch} className="mt-4 grid gap-3 md:grid-cols-4">
          <input required name="code" placeholder="HOU-SEP-26" className="rounded-lg border border-white/10 bg-[#101114] px-3 py-2 text-sm" />
          <input required name="label" placeholder="Houston September displays" className="rounded-lg border border-white/10 bg-[#101114] px-3 py-2 text-sm" />
          <input required name="printTemplateVersion" placeholder="tent-v1" defaultValue="tent-v1" className="rounded-lg border border-white/10 bg-[#101114] px-3 py-2 text-sm" />
          <div className="flex gap-3"><input required name="quantity" type="number" min="1" max="100" defaultValue="10" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#101114] px-3 py-2 text-sm" /><button disabled={creating} className="rounded-lg bg-[#f7bc5f] px-4 py-2 text-sm font-bold text-[#101114] disabled:opacity-50">{creating ? "Creating…" : "Create"}</button></div>
        </form>
      </section>

      {notice && <p role="status" className="mt-5 rounded-lg border border-[#D1B873]/30 bg-[#2c2412] px-4 py-3 text-sm text-[#F4D38A]">{notice}</p>}

      <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#17191F]">
        <div className="border-b border-white/10 px-5 py-4"><h3 className="font-bold">Kit inventory</h3></div>
        <div className="divide-y divide-white/10">
          {kits.map(kit => (
            <article key={kit.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1.1fr_1fr_1fr_auto] lg:items-center">
              <div><p className="font-mono text-base font-bold text-[#f7bc5f]">{kit.displayCode}</p><p className="mt-1 text-xs text-[#8c909f]">{kit.batch.label} · {kit.batch.printTemplateVersion}</p></div>
              <div><p className="text-sm font-semibold capitalize">{kit.status}</p><p className="mt-1 text-xs text-[#8c909f]">{kit.account ? `${kit.account.name} · /s/${kit.account.slug}` : "Not assigned"}</p></div>
              {kit.status === "available" ? <div><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find Account" className="w-full rounded-lg border border-white/10 bg-[#101114] px-3 py-2 text-sm" />{accounts.length > 0 && <select value={selectedAccount[kit.id] ?? ""} onChange={event => setSelectedAccount(current => ({ ...current, [kit.id]: event.target.value }))} className="mt-2 w-full rounded-lg border border-white/10 bg-[#101114] px-3 py-2 text-sm"><option value="">Select Account</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name} · {account.slug}</option>)}</select>}</div> : <div className="text-xs text-[#8c909f]">Assigned {kit.assignedAt ? new Date(kit.assignedAt).toLocaleDateString() : ""}</div>}
              <div className="flex gap-2"><button type="button" onClick={() => downloadQr(kit)} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold">PNG</button>{kit.status === "available" && <button type="button" onClick={() => assign(kit.id)} className="rounded-lg bg-[#f7bc5f] px-3 py-2 text-xs font-bold text-[#101114]">Assign</button>}</div>
            </article>
          ))}
          {kits.length === 0 && <p className="px-5 py-10 text-sm text-[#8c909f]">No kits yet. Create a numbered batch before printing any displays.</p>}
        </div>
      </section>
    </div>
  );
}
