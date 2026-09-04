import Link from "next/link";

export default function QrUnavailablePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#101114] px-6 text-center text-[#e1e2ec]">
      <section className="max-w-md rounded-2xl border border-white/10 bg-[#17191F] p-8 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#f7bc5f]">Grow Jewelry</p>
        <h1 className="mt-4 text-2xl font-bold">This design display is not available.</h1>
        <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">Ask a store associate for an active design link.</p>
        <Link href="/" className="mt-6 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#101114]">
          Visit Grow Jewelry
        </Link>
      </section>
    </main>
  );
}
