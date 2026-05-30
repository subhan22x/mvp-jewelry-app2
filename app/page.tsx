import Image from "next/image";
import Link from "next/link";
import DesignProgressBar from "./components/DesignProgressBar";
import { cx, themeBorder, themeRadius, themeSurface } from "@/src/lib/theme/ui-classes";

type CategoryCard = {
  id: string;
  label: string;
  href: string;
  iconSrc: string;
};

const categories: CategoryCard[] = [
  { id: "pendant", label: "Pendant", href: "/pendants", iconSrc: "/category-icons/pendant.png" },
  { id: "ring", label: "Ring", href: "/coming-soon", iconSrc: "/category-icons/ring.png" },
  { id: "bracelet", label: "Bracelet", href: "/coming-soon", iconSrc: "/category-icons/bracelet.png" },
  { id: "watches", label: "Watches", href: "/coming-soon", iconSrc: "/category-icons/watch.png" }
];

const cardClass = cx(
  "group relative flex aspect-square min-h-0 flex-col items-center justify-center overflow-hidden p-3 text-center shadow-[0_18px_38px_rgba(0,0,0,0.28)] transition hover:shadow-[0_0_28px_var(--theme-selected-glow)] sm:p-5",
  themeRadius.imageOptionMobile,
  themeBorder.base,
  themeBorder.hover,
  themeSurface.strong
);

export default function Page() {
  return (
    <main className="min-h-dvh px-4 py-8 text-[var(--theme-text)] md:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-4xl flex-col px-4 pb-10 pt-8 sm:px-6 md:px-12">
        <div className="mb-8 flex min-h-10 items-center justify-center">
          <DesignProgressBar current={0} />
        </div>

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
              </>
            );

            const className = cardClass;

            return (
              <Link key={category.id} href={category.href} className={className} aria-label={`${category.label} jewelry`}>
                {body}
              </Link>
            );
          })}
        </section>

        <div className="mt-auto pt-12" aria-hidden />
      </div>
    </main>
  );
}
