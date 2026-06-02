import Link from "next/link";

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#101114] px-4 text-[#e1e2ec]">
      <section className="w-full max-w-md rounded-2xl border border-[#D1B873]/25 bg-[#17191F] p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#D1B873]">One more step</p>
        <h1 className="mt-4 text-3xl font-bold text-white">Check your email</h1>
        <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">
          We sent a confirmation link{email ? ` to ${email}` : ""}. Open it to publish your profile and enter the owner dashboard.
        </p>
        <Link href="/login" className="mt-6 block rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-[#D1B873]">Back to login</Link>
      </section>
    </main>
  );
}
