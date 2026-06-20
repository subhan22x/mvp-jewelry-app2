"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { safeInternalPath } from "@/src/lib/auth/redirect";
import { createClient } from "@/src/lib/supabase/client";

function friendlyAuthError(params: URLSearchParams) {
  const description = params.get("error_description");
  if (description) return description.replace(/\+/g, " ");

  const code = params.get("error_code");
  if (code === "otp_expired") return "This email link is invalid or has expired. Please start signup again.";

  const error = params.get("error");
  if (error === "missing_confirmation_code") return "This confirmation link is missing the expected session details. Please start signup again.";
  if (error) return error.replace(/_/g, " ");

  return "Unable to confirm this login link. Please start signup again.";
}

export default function AuthConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Confirming your login...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      const nextPath = safeInternalPath(searchParams.get("next"), "/onboarding");
      const code = searchParams.get("code");
      if (code) {
        router.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(nextPath)}`);
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const queryAndHash = new URLSearchParams(searchParams.toString());
      hashParams.forEach((value, key) => queryAndHash.set(key, value));

      if (queryAndHash.get("error") || queryAndHash.get("error_code")) {
        if (!cancelled) {
          setError(friendlyAuthError(queryAndHash));
          setMessage("Confirmation link problem");
        }
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const supabase = createClient();

      try {
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (sessionError) throw sessionError;
          window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
        } else {
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          if (!data.session) throw new Error("No confirmed session was found in this link.");
        }

        if (cancelled) return;
        setMessage("Login confirmed. Redirecting...");

        const sessionResponse = await fetch("/api/auth/session", { cache: "no-store" });
        if (sessionResponse.ok || nextPath === "/onboarding") {
          window.location.replace(nextPath);
          return;
        }

        await supabase.auth.signOut();
        setError("This login is confirmed, but no active store account is linked yet.");
        setMessage("Store account not found");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to confirm this login link.");
        setMessage("Confirmation failed");
      }
    }

    void completeAuth();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <section className="w-full max-w-md rounded-2xl border border-[#D1B873]/25 bg-[#17191F] p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#D1B873]">Account confirmation</p>
      <h1 className="mt-4 text-3xl font-bold text-white">{message}</h1>
      {error ? <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">{error}</p> : null}
      {error ? (
        <div className="mt-6 grid gap-3">
          <Link href="/onboarding" className="block rounded-xl bg-[#D1B873] px-4 py-3 text-sm font-semibold text-black">Start signup again</Link>
          <Link href="/login" className="block rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-[#D1B873]">Back to login</Link>
        </div>
      ) : null}
    </section>
  );
}
