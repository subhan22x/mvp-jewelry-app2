import Image from "next/image";
import Link from "next/link";

type CardConfig = {
  id: string;
  label: string;
  subtitle?: string;
  href?: string;
  disabled?: boolean;
  active?: boolean;
  thumb?: string;
};

// Home screen tiles live here; add or update cards to change the entry points.
const cards: CardConfig[] = [
  { id: "logo", label: "Logo", href: "#", disabled: true },
  { id: "name", label: "Name", subtitle: "or Initials", href: "/name", active: true, thumb: "/pendants/deja.png" },
  { id: "picture", label: "Picture Pendants", href: "#", disabled: true },
  { id: "custom", label: "Custom Design", href: "#", disabled: true },
  { id: "inspired", label: "Get Inspired", href: "#", disabled: true },
  { id: "draw", label: "Draw your design", href: "#", disabled: true }
];

// Shared styling for each card. Adjust spacing or borders in one place.
const baseCardClass =
  "group relative flex min-h-[208px] flex-col items-center justify-between rounded-[28px] border border-white/15 bg-black/90 p-5 text-center transition hover:border-white/35";

export default function Page() {
  return (
    <main className="min-h-dvh px-4 py-10 text-white md:px-8">
      <div className="mx-auto w-full max-w-4xl px-4 pb-14 pt-10 sm:px-6 md:px-12">
        {/* Hero copy; tweak typography or messaging here. */}
        <header className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-white/70">001</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-[2.75rem]">Dream it first</h1>
          <p
            className="mt-2 text-3xl italic text-white/90"
            style={{ fontFamily: "var(--font-nostalgic)" }}
          >
            we&apos;ll build it.
          </p>
          <p className="mt-4 text-sm text-white/75">
            Choose your format and we'll help you design and customize it to your liking
          </p>
        </header>

        {/* Grid of entry cards; Tailwind grid classes control layout across breakpoints. */}
        <section className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
          {cards.map(card => {
            const isActive = Boolean(card.active);
            const disabledState = card.disabled ? "opacity-45 saturate-[0.7]" : "";
            const className = `${baseCardClass} ${disabledState} ${isActive ? "border-[3px] border-blue-400 shadow-[0_0_25px_rgba(59,130,246,0.35)]" : ""}`;

            const body = (
              <>
                <div className="relative aspect-square w-full overflow-hidden rounded-[22px] bg-black">
                  {card.thumb ? (
                    <Image
                      src={card.thumb}
                      alt={card.label}
                      fill
                      sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 18vw"
                      className="object-contain object-center"
                      priority={card.active}
                    />
                   ) : null}
                </div>
                <span
                  className="mt-4 text-sm font-semibold italic leading-tight tracking-wide text-white"
                  style={{ fontFamily: "var(--font-figtree)" }}
                >
                  {card.label}
                  {card.subtitle ? <><br />{card.subtitle}</> : null}
                </span>
              </>
            );

            return card.disabled || !card.href ? (
              <div key={card.id} className={className}>
                {body}
              </div>
            ) : (
              <Link key={card.id} href={card.href} className={className}>
                {body}
              </Link>
            );
          })}
        </section>

        {/* Pagination dots to mirror future carousel steps. */}
        <footer className="mt-12 flex items-center justify-center gap-2">
          {[0, 1, 2, 3].map(index => (
            <span
              key={index}
              className={`h-2.5 w-2.5 rounded-full ${index === 1 ? "bg-blue-400" : "bg-white/25"}`}
            />
          ))}
        </footer>
      </div>
    </main>
  );
}
