"use client";

import Link from "next/link";
import { useState } from "react";

type OwnerNavIcon = "quotes" | "vvs" | "reviews" | "collections" | "profile" | "settings";

const ownerNav = [
  { label: "Quotes", href: "/owner", icon: "quotes" },
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
      {icon === "quotes" && <path {...common} d="M7 8h10M7 12h7M6.5 19.5 4 21V5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9A2.5 2.5 0 0 1 17.5 17H9l-2.5 2.5Z" />}
      {icon === "vvs" && <path {...common} d="M12 3 15 9l6 3-6 3-3 6-3-6-6-3 6-3 3-6Z" />}
      {icon === "reviews" && <path {...common} d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" />}
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

export default function MobileOwnerNav({ active }: { active: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label={open ? "Close owner navigation" : "Open owner navigation"}
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#17191F] text-[#f7bc5f] shadow-sm transition hover:bg-white/5"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          {open ? (
            <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close owner navigation"
            className="fixed inset-0 top-16 z-40 bg-black/45"
            onClick={() => setOpen(false)}
          />
          <nav
            aria-label="Owner navigation"
            className="fixed left-3 right-3 top-20 z-50 rounded-2xl border border-white/10 bg-[#101114] p-2 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          >
            {ownerNav.map(item => {
              const isActive = item.label === active;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isActive ? "bg-[#56450a] text-[#f7bc5f]" : "text-[#c2c6d6] hover:bg-white/5 hover:text-[#e1e2ec]"
                  }`}
                >
                  <NavIcon icon={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
}
