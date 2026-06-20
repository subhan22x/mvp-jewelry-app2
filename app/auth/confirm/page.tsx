import { Suspense } from "react";
import AuthConfirmClient from "./AuthConfirmClient";

export const dynamic = "force-dynamic";

export default function AuthConfirmPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#101114] px-4 text-[#e1e2ec]">
      <Suspense
        fallback={
          <section className="w-full max-w-md rounded-2xl border border-[#D1B873]/25 bg-[#17191F] p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#D1B873]">Account confirmation</p>
            <h1 className="mt-4 text-3xl font-bold text-white">Confirming your login...</h1>
          </section>
        }
      >
        <AuthConfirmClient />
      </Suspense>
    </main>
  );
}
