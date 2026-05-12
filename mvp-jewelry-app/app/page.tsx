import Image from "next/image";
import Link from "next/link";

type CategoryCard = {
  id: string;
  label: string;
  href?: string;
  disabled?: boolean;
  iconSrc: string;
};

const categories: CategoryCard[] = [
  { id: "pendant", label: "Pendant", href: "/pendants", iconSrc: "/category-icons/pendant.png" },
  { id: "ring", label: "Ring", disabled: true, iconSrc: "/category-icons/ring.png" },
  { id: "bracelet", label: "Bracelet", disabled: true, iconSrc: "/category-icons/bracelet.png" },
  { id: "necklace", label: "Necklace", disabled: true, iconSrc: "/category-icons/necklace.png" }
];

const cardClass =
  "group relative flex aspect-square min-h-0 flex-col items-center justify-center overflow-hidden rounded-[20px] border-2 border-[color:var(--theme-border)] bg-[var(--theme-surface-strong)] p-3 text-center shadow-[0_18px_38px_rgba(0,0,0,0.28)] transition hover:border-[color:var(--theme-border-hover)] hover:shadow-[0_0_28px_var(--theme-selected-glow)] sm:rounded-[30px] sm:p-5";

export default function Page() {
  return (
    <main className="min-h-dvh px-4 py-8 text-[var(--theme-text)] md:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-4xl flex-col px-4 pb-10 pt-8 sm:px-6 md:px-12">
        <header className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--theme-text-soft)]">001</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[var(--theme-heading)] md:text-[2.75rem]">Dream it first</h1>
          <p
            className="mt-2 text-3xl italic text-[var(--theme-script)]"
            style={{ fontFamily: "var(--font-nostalgic)" }}
          >
            we&apos;ll build it.
          </p>
          <p className="mt-4 text-sm text-[var(--theme-text-soft)]">
            Choose your format and we'll help you design and customize it to your liking
          </p>
        </header>

        <section className="mt-12 grid max-w-2xl grid-cols-2 gap-4 sm:gap-8">
          {categories.map(category => {
            const body = (
              <>
                <div className="relative h-16 w-16 sm:h-32 sm:w-32">
                  <Image
                    src={category.iconSrc}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 64px, 128px"
                    className="object-contain"
                    priority={category.id === "pendant"}
                  />
                </div>
                <span className="mt-3 text-lg font-semibold tracking-tight text-[var(--theme-text)] sm:mt-5 sm:text-2xl">
                  {category.label}
                </span>
                {category.disabled ? (
                  <span className="mt-1 whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.18em] text-[var(--theme-text-muted)] sm:text-[10px] sm:tracking-[0.24em]">
                    coming soon
                  </span>
                ) : null}
              </>
            );

            const className = `${cardClass} ${category.disabled ? "cursor-not-allowed opacity-55" : ""}`;

            return category.disabled || !category.href ? (
              <div key={category.id} className={className} aria-disabled="true">
                {body}
              </div>
            ) : (
              <Link key={category.id} href={category.href} className={className} aria-label={`${category.label} jewelry`}>
                {body}
              </Link>
            );
          })}
        </section>

        <footer className="mt-auto flex items-center justify-center gap-7 pt-12">
          {[0, 1, 2, 3, 4].map(index => (
            <span
              key={index}
              className={`h-4 w-4 rounded-full border-2 border-[color:var(--theme-accent)] ${index === 0 ? "bg-[var(--theme-accent)]" : "bg-transparent"}`}
            />
          ))}
        </footer>
      </div>
    </main>
  );
}
