"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerLoginForm() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/owner-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessCode })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "Unable to sign in.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#101114] px-4 text-[#e1e2ec]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-[#D1B873]/25 bg-[#17191F] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
      >
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D1B873]">Owner</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">Store Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-[#c2c6d6]">
            Enter the owner access code to review quote requests and generation activity.
          </p>
        </div>

        <label htmlFor="owner-access-code" className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">
          Access code
        </label>
        <input
          id="owner-access-code"
          type="password"
          value={accessCode}
          onChange={event => setAccessCode(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-white/35"
          placeholder="Enter code"
          required
        />

        {error && (
          <div className="mt-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full rounded-2xl bg-[#3B82F6] px-5 py-3 text-base font-semibold text-white shadow-[0_0_25px_rgba(59,130,246,0.35)] transition hover:bg-blue-400 disabled:cursor-wait disabled:opacity-60"
        >
          {submitting ? "checking..." : "enter dashboard"}
        </button>
      </form>
    </main>
  );
}
