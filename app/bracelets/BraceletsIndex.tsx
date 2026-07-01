import Image from "next/image";
import Link from "next/link";
import DesignStepHeader from "../components/DesignStepHeader";

type BraceletCard = {
  id: string;
  label: string;
  href: string;
  thumb: string;
  active?: boolean;
};

const cards: BraceletCard[] = [
  {
    id: "icedout",
    label: "Icedout Bracelets",
    href: "/bracelets/icedout",
    thumb: "/bracelets/styles/icedout-bracelet-1.png"
  },
  {
    id: "womens",
    label: "Women's Bracelets",
    href: "/bracelets/womens",
    thumb: "/bracelets/styles/womens-bracelet-1.webp"
  }
];

const baseCardClass =
  "group relative flex min-h-[208px] flex-col items-center justify-between rounded-[28px] border border-white/15 bg-black/90 p-5 text-center transition hover:border-white/35";

export default function BraceletsIndex({ basePath }: { basePath?: string } = {}) {
  const braceletBase = basePath ? `${basePath}/bracelets` : "/bracelets";
  const visibleCards = cards.map(card => ({
    ...card,
    href: card.href.replace("/bracelets", braceletBase)
  }));

  return (
    <main className="min-h-dvh px-4 py-5 text-white md:px-8 md:py-10">
      <div className="mx-auto w-full max-w-4xl px-4 pb-14 pt-3 sm:px-6 md:px-12 md:pt-10">
        <DesignStepHeader current={0} backHref={basePath ?? "/design"} />

        <header className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">001</p>
          <h1 className="mt-2 text-[1.95rem] font-bold leading-none tracking-tight md:text-[2.75rem]">Dream it first</h1>
          <p
            className="mt-1 text-[1.45rem] italic leading-none text-white/90 md:mt-2 md:text-3xl"
            style={{ fontFamily: "var(--font-nostalgic)" }}
          >
            we&apos;ll build it.
          </p>
          <p className="mt-3 max-w-lg text-[0.68rem] leading-relaxed text-white/75 md:mt-4 md:text-sm">
            Choose your bracelet format and we'll help you design and customize it to your liking
          </p>
        </header>

        <section className="mt-7 grid grid-cols-2 gap-4 sm:gap-6 md:mt-12 md:grid-cols-3">
          {visibleCards.map(card => {
            const className = `${baseCardClass} ${card.active ? "border-[3px] border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.35)]" : ""}`;
            return (
              <Link key={card.id} href={card.href} className={className}>
                <div className="relative aspect-square w-full overflow-hidden rounded-[22px] bg-black">
                  <Image
                    src={card.thumb}
                    alt={card.label}
                    fill
                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw"
                    className="object-contain object-center"
                    priority
                  />
                </div>
                <span
                  className="mt-4 text-sm font-semibold italic leading-tight tracking-wide text-white"
                  style={{ fontFamily: "var(--font-figtree)" }}
                >
                  {card.label}
                </span>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}
