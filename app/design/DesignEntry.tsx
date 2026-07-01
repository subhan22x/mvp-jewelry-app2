import Image from "next/image";
import Link from "next/link";
import DesignStepHeader from "../components/DesignStepHeader";
import { cx, themeBorder, themeSurface } from "@/src/lib/theme/ui-classes";

type CategoryCard = {
  id: string;
  label: string;
  href: string;
  iconSrc: string;
  available: boolean;
};

const categories: CategoryCard[] = [
  { id: "pendant", label: "Pendant", href: "/pendants", iconSrc: "/category-icons/pendant.png", available: true },
  { id: "grillz", label: "Grillz", href: "/grillz", iconSrc: "/category-icons/grillz.svg", available: true },
  { id: "bracelet", label: "Bracelet", href: "/bracelets", iconSrc: "/category-icons/bracelet.png", available: true },
  { id: "necklace", label: "Necklace", href: "/necklaces", iconSrc: "/category-icons/necklace.png", available: true },
  { id: "ring", label: "Ring", href: "/coming-soon", iconSrc: "/category-icons/ring.png", available: false },
  { id: "watches", label: "Watches", href: "/coming-soon", iconSrc: "/category-icons/watch.png", available: false }
];

const cardClass = cx(
  "group relative flex aspect-square min-h-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-3 text-center shadow-[0_18px_38px_rgba(0,0,0,0.28)] transition hover:shadow-[0_0_28px_var(--theme-selected-glow)] sm:gap-3 sm:rounded-[28px] sm:p-5",
  themeBorder.base,
  themeBorder.hover,
  themeSurface.strong
);

const disabledCardClass = cx(
  cardClass,
  "cursor-not-allowed border-white/10 bg-[#0d0d0d]/70 opacity-45 grayscale hover:shadow-[0_18px_38px_rgba(0,0,0,0.28)]"
);

export default function DesignEntry({ basePath }: { basePath?: string } = {}) {
  const withBase = (path: string) => basePath ? `${basePath}${path}` : path;
  const visibleCategories = categories.map(category => ({
    ...category,
    href: category.available
      ? withBase(category.href)
      : category.href
  }));
  return (
    <main data-tour-id="design-entry" className="min-h-dvh px-4 py-8 text-[var(--theme-text)] md:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-4xl flex-col px-4 pb-10 pt-8 sm:px-6 md:px-12">
        <DesignStepHeader current={0} />

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

        <section className="mt-12 grid max-w-2xl grid-cols-2 gap-4 sm:gap-6">
          {visibleCategories.map(category => {
            const content = (
              <>
                <div className="relative h-14 w-14 sm:h-28 sm:w-28">
                  <Image
                    src={category.iconSrc}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 56px, 112px"
                    className="object-contain"
                    priority={category.id === "pendant"}
                  />
                </div>
                <span className="text-base font-semibold tracking-tight text-[var(--theme-text)] sm:text-2xl">
                  {category.label}
                </span>
                {!category.available && (
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/75 sm:text-[10px]">
                    Coming soon
                  </span>
                )}
              </>
            );

            return category.available ? (
              <Link key={category.id} href={category.href} className={cardClass} aria-label={`${category.label} jewelry`}>
                {content}
              </Link>
            ) : (
              <div key={category.id} className={disabledCardClass} aria-disabled="true" aria-label={`${category.label} jewelry coming soon`}>
                {content}
              </div>
            );
          })}
        </section>

        <div className="mt-auto pt-12" aria-hidden />
      </div>
    </main>
  );
}
