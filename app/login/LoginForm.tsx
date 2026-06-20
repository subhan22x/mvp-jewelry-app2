"use client";

import Image from "next/image";
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
  const [oauthSubmitting, setOauthSubmitting] = useState<"google" | null>(null);

  async function signInWithOAuth(provider: "google") {
    setOauthSubmitting(provider);
    setError(null);
    const next = safeInternalPath(searchParams.get("next"));
    const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
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
    <main className="flex min-h-dvh items-center justify-center bg-[#050504] px-4 py-10 text-[#ede4d4]">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Image src="/landing/flawless-lettering-logo.png" alt="Flawless" width={199} height={79} className="h-auto w-32 object-contain" priority />
          <h1 className="mt-3 text-4xl font-bold text-white">Owner login</h1>
          <p className="mt-2 text-sm leading-6 text-[#91877b]">Review quotes, update your storefront, and generate studio assets.</p>
        </div>

        <div className="rounded-2xl border border-[rgba(237,228,212,.09)] bg-[#15120d] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
          <div className="grid gap-3">
            <button
              type="button"
              disabled={submitting || oauthSubmitting !== null}
              onClick={() => void signInWithOAuth("google")}
              className="flex h-12 items-center justify-center gap-3 rounded-xl border border-[rgba(237,228,212,.14)] bg-[#090706] px-4 text-sm font-bold text-[#ede4d4] transition hover:border-[rgba(235,180,103,.44)] hover:bg-[#100c08] disabled:opacity-60"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-black text-[#4285F4]">G</span>
              {oauthSubmitting === "google" ? "Opening Google..." : "Continue with Google"}
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#91877b]">
            <span className="h-px flex-1 bg-[rgba(237,228,212,.09)]" />
            <span>Email</span>
            <span className="h-px flex-1 bg-[rgba(237,228,212,.09)]" />
          </div>

          <form onSubmit={submit}>
          <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#91877b]">
            Email
            <input type="email" value={email} onChange={event => setEmail(event.target.value)} required className="mt-2 w-full rounded-xl border border-[rgba(237,228,212,.12)] bg-[#090706] px-4 py-3 text-base normal-case tracking-normal text-white outline-none focus:border-[#ebb467]" />
          </label>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-[#91877b]">
            Password
            <input type="password" value={password} onChange={event => setPassword(event.target.value)} required className="mt-2 w-full rounded-xl border border-[rgba(237,228,212,.12)] bg-[#090706] px-4 py-3 text-base normal-case tracking-normal text-white outline-none focus:border-[#ebb467]" />
          </label>
          {error ? <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
          <button disabled={submitting} className="mt-5 w-full rounded-xl bg-[linear-gradient(165deg,#ebb467,#d4924a)] px-4 py-3 font-bold text-[#1b1006] shadow-[0_10px_24px_-12px_rgba(212,146,74,.8)] disabled:opacity-60">
            {submitting ? "Signing in..." : "Login"}
          </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-[#91877b]">
          New store? <Link href="/onboarding" className="font-semibold text-[#ebb467]">Create your profile</Link>
        </p>
      </div>
    </main>
  );
}
