"use client";

import { useEffect, useRef, useState } from "react";

export type AssignableAccount = {
  id: string;
  name: string;
  slug: string;
  storefrontPublished: boolean;
};

export default function AccountAssignmentDialog({ kit, onClose, onAssign }: {
  kit: { id: string; displayCode: string };
  onClose: () => void;
  onAssign: (account: AssignableAccount) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [query, setQuery] = useState("");
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const cursor = cursors[cursors.length - 1];
  const [accounts, setAccounts] = useState<AssignableAccount[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<AssignableAccount | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    searchInput.current?.focus();
    return () => element?.close();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // Debounce typed searches. The initial Account list loads immediately.
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query.trim() });
        if (cursor) params.set("cursor", cursor);
        const response = await fetch(`/api/admin/accounts?${params}`, { signal: controller.signal, cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load Accounts.");
        if (!Array.isArray(payload.items)) throw new Error("Unable to load Accounts.");
        if (!controller.signal.aborted) {
          setAccounts(payload.items);
          setNextCursor(payload.nextCursor ?? null);
        }
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Unable to load Accounts.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query.trim() ? 200 : 0);
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query, cursor, retry]);

  function resetList() {
    setLoading(true);
    setLoadError(null);
    setAccounts([]);
    setNextCursor(null);
  }

  async function confirmAssignment() {
    if (!selected || submitting.current) return;
    submitting.current = true;
    setAssigning(true);
    setAssignmentError(null);
    try {
      await onAssign(selected);
      onClose();
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : "Unable to assign QR kit.");
    } finally {
      submitting.current = false;
      setAssigning(false);
    }
  }

  return (
    <dialog ref={dialog} aria-labelledby="assign-account-title"
      onCancel={event => { event.preventDefault(); if (!submitting.current) onClose(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-[#17191F] p-5 text-[#e1e2ec] shadow-2xl backdrop:bg-black/70 open:flex open:flex-col sm:p-6">
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div>
          <h2 id="assign-account-title" className="text-xl font-bold">Choose an Account</h2>
          <p className="mt-2 break-all font-mono text-sm text-[#f7bc5f]">{kit.displayCode}</p>
        </div>
        <button type="button" disabled={assigning} onClick={onClose} aria-label="Close Account picker"
          className="rounded-lg border border-white/15 px-3 py-2 text-sm disabled:opacity-50">Close</button>
      </div>
      <label htmlFor="account-search" className="mb-2 mt-5 block shrink-0 text-sm">Search Accounts by name or slug</label>
      <input ref={searchInput} id="account-search" type="search" value={query} maxLength={120} disabled={assigning}
        placeholder="All active Accounts"
        onChange={event => { setQuery(event.target.value); setCursors([null]); resetList(); }}
        className="w-full shrink-0 rounded-lg border border-white/15 bg-[#101114] px-3 py-3 text-sm" />

      <div aria-live="polite" aria-busy={loading} className="mt-4 min-h-0 max-h-[40dvh] flex-1 overflow-y-auto">
        {loading ? <p className="py-6 text-sm text-[#c2c6d6]">Loading Accounts…</p> : loadError ? (
          <div role="alert" className="py-4 text-sm text-[#f7bc5f]">
            <p>{loadError}</p>
            <button type="button" onClick={() => { resetList(); setRetry(value => value + 1); }} className="mt-3 rounded-lg border border-white/15 px-3 py-2">Retry loading Accounts</button>
          </div>
        ) : accounts.length === 0 ? (
          <p className="py-6 text-sm text-[#c2c6d6]">{query.trim() ? "No Accounts match this search." : "No active Accounts are available. Complete store signup first."}</p>
        ) : (
          <div className="space-y-2">
            {accounts.map(account => (
              <button key={account.id} type="button" disabled={assigning} aria-pressed={selected?.id === account.id}
                onClick={() => { setSelected(account); setAssignmentError(null); }}
                className={`w-full rounded-lg border p-3 text-left disabled:opacity-50 ${selected?.id === account.id ? "border-[#f7bc5f] bg-[#2c2412]" : "border-white/10 bg-[#101114] hover:border-white/30"}`}>
                <span className="block break-words text-sm font-semibold">{account.name}</span>
                <span className="mt-1 block break-all text-xs text-[#c2c6d6]">/s/{account.slug}/design</span>
                {!account.storefrontPublished && <span className="mt-1 block text-xs text-[#f7bc5f]">Storefront not published yet</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4 flex shrink-0 items-center justify-between gap-3 text-sm">
        <button type="button" disabled={loading || assigning || cursors.length === 1}
          onClick={() => { setCursors(current => current.slice(0, -1)); resetList(); }}
          className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-40">Previous Accounts</button>
        <button type="button" disabled={loading || assigning || !nextCursor}
          onClick={() => { if (nextCursor) { setCursors(current => [...current, nextCursor]); resetList(); } }}
          className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-40">Next Accounts</button>
      </div>

      <div className="mt-5 shrink-0 border-t border-white/10 pt-4">
        {selected ? (
          <p className="break-words text-sm">Assign <span className="font-mono text-[#f7bc5f]">{kit.displayCode}</span> to <strong>{selected.name}</strong> <span className="text-[#c2c6d6]">({selected.slug})</span>?</p>
        ) : <p className="text-sm text-[#c2c6d6]">Select an Account from the list to continue.</p>}
        <p className="mt-2 text-xs leading-5 text-[#c2c6d6]">Assignment is permanent. Customer scans require a published storefront and active customer access. Test the printed QR before leaving it in the store.</p>
        {assignmentError && <p role="alert" className="mt-3 text-sm text-[#f7bc5f]">{assignmentError}</p>}
        <button type="button" disabled={!selected || assigning} onClick={confirmAssignment}
          className="mt-4 w-full rounded-lg bg-[#f7bc5f] px-4 py-3 text-sm font-bold text-[#101114] disabled:opacity-40">{assigning ? "Assigning…" : "Confirm assignment"}</button>
      </div>
    </dialog>
  );
}
