"use client";

import Link from "next/link";
import { useState } from "react";
import { isAuthApiError } from "@supabase/auth-js";
import { createClient } from "@/src/lib/supabase/client";

function verificationErrorMessage(error: unknown) {
  if (isAuthApiError(error)) {
    const message = error.message.toLowerCase();
    if (error.status === 429 || message.includes("rate limit")) {
      return "Too many attempts. Wait a minute, then try again.";
    }
    if (error.code === "otp_expired" || message.includes("expired")) {
      return "That code has expired. Request a new email and try again.";
    }
    if (message.includes("invalid") || message.includes("token")) {
      return "That code is incorrect or has already been used.";
    }
  }
  return error instanceof Error ? error.message : "Unable to verify this code.";
}

export default function CheckEmailClient({ email }: { email: string }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = code.replace(/\D/g, "");
    if (!email || token.length !== 6) {
      setError("Enter the six-digit code from your email.");
      return;
    }

    setVerifying(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email"
      });
      if (verifyError || !data.session) throw verifyError ?? new Error("Verification succeeded without a login session.");
      window.location.replace("/onboarding");
    } catch (verifyError) {
      setError(verificationErrorMessage(verifyError));
      setVerifying(false);
    }
  }

  async function resendCode() {
    if (!email) return;
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const supabase = createClient();
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding` }
      });
      if (resendError) throw resendError;
      setCode("");
      setNotice("A new code and confirmation link are on the way. The previous code will no longer work.");
    } catch (resendError) {
      setError(verificationErrorMessage(resendError));
    } finally {
      setResending(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-2xl border border-[#ebb467]/25 bg-[#15120d] p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#ebb467]">Verify your email</p>
      <h1 className="mt-4 text-3xl font-bold text-white">Enter your code</h1>
      <p className="mt-3 text-sm leading-6 text-[#a99f94]">
        We sent a six-digit code and a secure confirmation link{email ? <> to <strong className="text-[#ede4d4]">{email}</strong></> : " to your email"}.
      </p>

      <form className="mt-6" onSubmit={verifyCode}>
        <label htmlFor="email-code" className="sr-only">Six-digit email verification code</label>
        <input
          id="email-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          autoFocus
          className="h-16 w-full rounded-xl border border-[rgba(237,228,212,.15)] bg-[#090706] px-4 text-center font-mono text-3xl font-bold tracking-[0.34em] text-white outline-none transition placeholder:text-[#4f4841] focus:border-[#ebb467] focus:ring-2 focus:ring-[#ebb467]/20"
        />
        {error ? <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</p> : null}
        {notice ? <p role="status" className="mt-4 rounded-xl border border-[#ebb467]/25 bg-[#ebb467]/10 px-4 py-3 text-sm text-[#f4d39f]">{notice}</p> : null}
        <button
          type="submit"
          disabled={verifying || code.length !== 6 || !email}
          className="mt-5 w-full rounded-xl bg-[linear-gradient(165deg,#ebb467,#d4924a)] px-4 py-3 font-bold text-[#1b1006] shadow-[0_10px_24px_-12px_rgba(212,146,74,.8)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {verifying ? "Verifying…" : "Verify and create studio"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#665d54]">
        <span className="h-px flex-1 bg-[rgba(237,228,212,.09)]" />
        <span>or</span>
        <span className="h-px flex-1 bg-[rgba(237,228,212,.09)]" />
      </div>

      <p className="text-sm leading-6 text-[#91877b]">Open the confirmation link in the same email to sign in automatically.</p>
      <button
        type="button"
        onClick={() => void resendCode()}
        disabled={resending || !email}
        className="mt-4 text-sm font-semibold text-[#ebb467] underline decoration-[#ebb467]/40 underline-offset-4 disabled:opacity-50"
      >
        {resending ? "Sending…" : "Send a new code"}
      </button>
      <Link href="/onboarding" className="mt-5 block rounded-xl border border-[rgba(237,228,212,.12)] px-4 py-3 text-sm font-semibold text-[#ede4d4]">Change email or return to setup</Link>
    </section>
  );
}
