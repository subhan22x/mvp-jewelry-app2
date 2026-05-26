import Link from "next/link";
import DesignProgressBar from "../components/DesignProgressBar";

export default function ComingSoonPage() {
  return (
    <main className="min-h-dvh px-4 py-8 text-[var(--theme-text)] md:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-4xl flex-col px-4 pb-10 pt-8 sm:px-6 md:px-12">
        <div className="mb-8 grid min-h-10 grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3">
          <Link
            href="/"
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--theme-border)] bg-black/35 text-xl leading-none text-[var(--theme-text)] transition hover:border-[var(--theme-border-hover)]"
          >
            ←
          </Link>
          <DesignProgressBar current={0} className="justify-self-center" />
          <span aria-hidden="true" />
        </div>

        <section className="flex flex-1 items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--theme-text-soft)]">Coming soon</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-[var(--theme-heading)] md:text-[2.75rem]">
              Coming soon
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--theme-text-soft)]">
              This design format is not available yet.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
