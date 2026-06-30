import Image from "next/image";
import Link from "next/link";
import DesignProgressBar from "../components/DesignProgressBar";
import { NECKLACE_STYLES } from "./necklace-options";

const baseCardClass =
  "group relative flex min-h-[208px] flex-col items-center justify-between rounded-[28px] border border-white/15 bg-black/90 p-5 text-center transition hover:border-white/35";

export default function NecklacesIndex({ basePath }: { basePath?: string } = {}) {
  const necklaceBase = basePath ? `${basePath}/necklaces` : "/necklaces";

  return (
    <main className="min-h-dvh px-4 py-5 text-white md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-4xl px-4 pb-14 pt-3 sm:px-6 md:px-12 md:pt-10">
        <div className="mb-8 grid min-h-10 grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3">
          <Link
            href={basePath ?? "/design"}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/35 text-xl leading-none text-white transition hover:border-white/45"
          >
            ←
          </Link>
          <DesignProgressBar current={0} className="justify-self-center" />
          <span aria-hidden="true" />
        </div>

        <header className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">001</p>
          <h1 className="mt-2 text-[1.95rem] font-bold leading-none tracking-tight md:text-[2.75rem]">Choose a chain style</h1>
          <p
            className="mt-1 text-[1.45rem] italic leading-none text-white/90 md:mt-2 md:text-3xl"
            style={{ fontFamily: "var(--font-nostalgic)" }}
          >
            then customize it.
          </p>
          <p className="mt-3 max-w-lg text-[0.68rem] leading-relaxed text-white/75 md:mt-4 md:text-sm">
            Pick a necklace style first. The next step handles color, size, stones, budget, and pendant try-on.
          </p>
        </header>

        <section className="mt-7 grid grid-cols-2 gap-4 sm:gap-6 md:mt-12 md:grid-cols-3">
          {NECKLACE_STYLES.map((style, index) => {
            const disabledState = style.available ? "" : "opacity-45 saturate-[0.7]";
            const className = `${baseCardClass} ${disabledState}`;
            const body = (
              <>
                <div className="relative aspect-square w-full overflow-hidden rounded-[22px] bg-black">
                  {style.thumb ? (
                    <Image
                      src={style.thumb}
                      alt={style.label}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw"
                      className="object-contain object-center"
                      priority={index < 4}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm font-semibold text-white/55">
                      {style.upload ? "Upload your own chain reference" : "Artwork needed"}
                    </div>
                  )}
                </div>
                <span
                  className="mt-4 text-sm font-semibold italic leading-tight tracking-wide text-white"
                  style={{ fontFamily: "var(--font-figtree)" }}
                >
                  {style.label}
                </span>
              </>
            );

            return style.available ? (
              <Link key={style.id} href={`${necklaceBase}/${style.id}`} className={className}>
                {body}
              </Link>
            ) : (
              <div key={style.id} className={className}>
                {body}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
