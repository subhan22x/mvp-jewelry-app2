import Link from "next/link";
import type { ReactNode } from "react";
import MobileOwnerNav from "./MobileOwnerNav";

type OwnerNavIcon = "quotes" | "design" | "vvs" | "reviews" | "collections" | "profile" | "settings";

const ownerNav = [
  { label: "Quotes", href: "/owner", icon: "quotes" },
  { label: "VVS Design", href: "/", icon: "design" },
  { label: "VVS Studio", href: "/owner/vvs-studio", icon: "vvs" },
  { label: "Reviews", href: "/owner/reviews", icon: "reviews" },
  { label: "Collections", href: "/owner/collections", icon: "collections" },
  { label: "Profile", href: "/owner/profile", icon: "profile" },
  { label: "Settings", href: "/owner/settings", icon: "settings" }
] satisfies Array<{ label: string; href: string; icon: OwnerNavIcon }>;

function NavIcon({ icon }: { icon: OwnerNavIcon }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      {icon === "quotes" && (
        <>
          <path {...common} d="M7 8h10M7 12h7M6.5 19.5 4 21V5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9A2.5 2.5 0 0 1 17.5 17H9l-2.5 2.5Z" />
        </>
      )}
      {icon === "vvs" && (
        <>
          <path {...common} d="M12 3 15 9l6 3-6 3-3 6-3-6-6-3 6-3 3-6Z" />
        </>
      )}
      {icon === "design" && (
        <>
          <path {...common} d="M5 19h14" />
          <path {...common} d="M7 16.5 17.9 5.6a2.1 2.1 0 0 1 3 3L10 19H6.5v-3.5Z" />
          <path {...common} d="m15.5 8 2.5 2.5" />
        </>
      )}
      {icon === "reviews" && (
        <>
          <path {...common} d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
        </>
      )}
      {icon === "collections" && (
        <>
          <rect {...common} x="4" y="4" width="7" height="7" rx="1.5" />
          <rect {...common} x="13" y="4" width="7" height="7" rx="1.5" />
          <rect {...common} x="4" y="13" width="7" height="7" rx="1.5" />
          <rect {...common} x="13" y="13" width="7" height="7" rx="1.5" />
        </>
      )}
      {icon === "profile" && (
        <>
          <path {...common} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path {...common} d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </>
      )}
      {icon === "settings" && (
        <>
          <path {...common} d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path {...common} d="M19 12a7.7 7.7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z" />
        </>
      )}
    </svg>
  );
}

export default function OwnerFrame({ active, children, hideHeader = false }: { active: string; children: ReactNode; hideHeader?: boolean }) {
  return (
    <main className={`min-h-dvh max-w-full overflow-x-hidden bg-[#101114] pb-28 text-[#e1e2ec] antialiased selection:bg-[#f7bc5f] selection:text-[#101114] lg:pl-72 ${hideHeader ? "pt-0" : "pt-20"}`}>
      {!hideHeader && (
        <header className="fixed left-0 top-0 z-40 flex h-16 w-full max-w-full items-center justify-between gap-3 overflow-hidden border-b border-white/10 bg-[#101114] px-4 shadow-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <MobileOwnerNav active={active} />
            <span className="text-[#f7bc5f]" aria-hidden>*</span>
            <span className="truncate text-base font-bold tracking-tight text-[#f7bc5f] sm:text-lg">Jewelry Design Studio</span>
          </div>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-[#17191F] text-xs font-bold text-[#D1B873]">
            JS
          </div>
        </header>
      )}

      <aside className={`fixed left-0 top-0 z-30 hidden h-full w-72 flex-col border-r border-white/5 bg-[#17191F] px-2 py-6 shadow-2xl lg:flex ${hideHeader ? "pt-6" : "pt-20"}`}>
        <div className="mb-8 px-4">
          <h2 className="text-xl font-bold text-[#f7bc5f]">Luxe Jewelry Admin</h2>
          <p className="mt-1 text-sm text-[#c2c6d6]">Global Manager</p>
          <span className="mt-3 inline-block rounded border border-[#dec47e]/20 bg-[#56450a]/50 px-2 py-1 text-[11px] text-[#dec47e]">Premium Tier</span>
        </div>
        <nav className="flex flex-col gap-2">
          {ownerNav.map(item => {
            const isActive = item.label === active;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`mx-2 flex items-center gap-3 rounded-lg px-4 py-3 transition ${
                  isActive ? "translate-x-1 bg-[#56450a] text-[#dec47e]" : "text-[#c2c6d6] hover:bg-white/5"
                }`}
              >
                <NavIcon icon={item.icon} />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {children}
    </main>
  );
}
