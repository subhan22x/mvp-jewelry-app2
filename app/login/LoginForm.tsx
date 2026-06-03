"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/src/lib/supabase/client";
import { safeInternalPath } from "@/src/lib/auth/redirect";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] = useState<"google" | "apple" | null>(null);

  async function signInWithOAuth(provider: "google" | "apple") {
    setOauthSubmitting(provider);
    setError(null);
    const next = safeInternalPath(searchParams.get("next"));
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });
    if (error) {
      setError(error.message);
      setOauthSubmitting(null);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const sessionResponse = await fetch("/api/auth/session");
      if (!sessionResponse.ok) {
        const sessionBody = await sessionResponse.json().catch(() => null);
        await supabase.auth.signOut();
        throw new Error(sessionBody?.error ?? "No active store account is linked to this login.");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign in.");
      setSubmitting(false);
      return;
    }
    const next = searchParams.get("next");
    router.replace(safeInternalPath(next));
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#101114] px-4 py-10 text-[#e1e2ec]">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#D1B873]">Jewelry Design Studio</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Owner login</h1>
          <p className="mt-2 text-sm leading-6 text-[#c2c6d6]">Review quotes, update your storefront, and generate studio assets.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#17191F] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
          <div className="grid gap-3">
            <button
              type="button"
              disabled={submitting || oauthSubmitting !== null}
              onClick={() => void signInWithOAuth("google")}
              className="h-12 rounded-xl border border-white/10 bg-black/35 px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {oauthSubmitting === "google" ? "Opening Google..." : "Continue with Google"}
            </button>
            <button
              type="button"
              disabled={submitting || oauthSubmitting !== null}
              onClick={() => void signInWithOAuth("apple")}
              className="h-12 rounded-xl border border-white/10 bg-black/35 px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {oauthSubmitting === "apple" ? "Opening Apple..." : "Continue with Apple"}
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#8c909f]">
            <span className="h-px flex-1 bg-white/10" />
            <span>Email</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={submit}>
          <div className="mb-5 flex rounded-xl border border-white/10 bg-black/25 p-1 text-sm">
            <span className="flex-1 rounded-lg bg-[#D1B873] px-3 py-2 text-center font-bold text-black">Email</span>
            <span className="flex-1 px-3 py-2 text-center text-[#8c909f]">Phone OTP - coming soon</span>
          </div>
          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">
            Email
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-base normal-case tracking-normal text-white outline-none focus:border-[#D1B873]" />
          </label>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-[#8c909f]">
            Password
            <input type="password" value={password} onChange={event => setPassword(event.target.value)} required className="mt-2 w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-base normal-case tracking-normal text-white outline-none focus:border-[#D1B873]" />
          </label>
          {error ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
          <button disabled={submitting} className="mt-5 w-full rounded-xl bg-[#D1B873] px-4 py-3 font-bold text-black disabled:opacity-60">
            {submitting ? "Signing in..." : "Login"}
          </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-[#8c909f]">
          New store? <Link href="/onboarding" className="font-semibold text-[#D1B873]">Create your profile</Link>
        </p>
      </div>
    </main>
  );
}
