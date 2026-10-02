import SignupCreditRefresh from "./SignupCreditRefresh";
import { getSignupCredits, isSignupCreditAccount } from "@/src/lib/billing/signup-credits";
import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import MobileOwnerNav from "./MobileOwnerNav";
import { TRIAL_DAYS } from "@/src/lib/billing/plans";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { evaluateAccountEntitlement, getAccountBillingSnapshot } from "@/src/lib/billing/entitlements";
import { prisma } from "@/server/db/client";

function initialsFor(name: string | null | undefined, fallback: string | null | undefined) {
  const words = (name || fallback || "").trim().split(/[\s@._-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0]?.slice(0, 2) ?? "").toUpperCase() || "?";
}

type OwnerNavIcon = "quotes" | "design" | "vvs" | "reviews" | "collections" | "profile" | "settings" | "account" | "access";

function ownerNav(isSaasAdmin: boolean) {
  return [
  { label: "Quotes", href: "/owner", icon: "quotes" },
  { label: "Design", href: "/owner/design", icon: "design" },
  { label: "Studio", href: "/owner/vvs-studio", icon: "vvs" },
  { label: "Account", href: "/owner/account", icon: "account" },
  { label: "Settings", href: "/owner/settings", icon: "settings" },
  ...(isSaasAdmin ? [{ label: "Access", href: "/owner/access-exceptions", icon: "access" as const }] : []),
] satisfies Array<{ label: string; href: string; icon: OwnerNavIcon }>;
}

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
      {icon === "account" && (
        <>
          <path {...common} d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
          <path {...common} d="M7.5 10h4.5M7.5 14h8.5" />
          <path {...common} d="M16.5 9.5h.01" />
        </>
      )}
      {icon === "access" && (
        <>
          <rect {...common} x="4" y="5" width="16" height="15" rx="2" />
          <path {...common} d="M8 11h8M8 15h5" />
          <path {...common} d="m16.5 3 .8 1.7L19 5.5l-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8.8-1.7Z" />
        </>
      )}
    </svg>
  );
}

export default async function OwnerFrame({
  active,
  children,
  hideHeader = false,
  flushContent = false,
}: {
  active: string;
  children: ReactNode;
  hideHeader?: boolean;
  flushContent?: boolean;
}) {
  const owner = await getOwnerContext();
  const [ownerUser, ownerAccount] = owner
    ? await Promise.all([
      prisma.user.findUnique({ where: { id: owner.userId }, select: { name: true } }),
      prisma.account.findUnique({ where: { id: owner.accountId }, select: { name: true } }),
    ])
    : [null, null];
  const billingSnapshot = owner ? await getAccountBillingSnapshot(owner.accountId) : null;
  const entitlement = billingSnapshot ? evaluateAccountEntitlement(billingSnapshot) : null;
  const canStartTrial = Boolean(billingSnapshot && !billingSnapshot.hasUsedTrial && !billingSnapshot.stripeSubscriptionId);
  const signupCredits = owner ? await getSignupCredits(owner.accountId) : { granted: 0, remaining: 0, pending: 0 };
  const hasSignupAccess = isSignupCreditAccount(billingSnapshot) && !entitlement?.canUsePaidFeatures && (signupCredits.remaining > 0 || signupCredits.pending > 0);
  const canUseSignupDashboard = Boolean(hasSignupAccess && ["Quotes", "Design", "Account", "Settings", "Profile"].includes(active));
  const showSignupCredits = canUseSignupDashboard && signupCredits.remaining <= 4;
  const accountBadge = hasSignupAccess ? `${signupCredits.remaining} free generations` : entitlement ? `${entitlement.planLabel} · ${entitlement.statusLabel}` : "Account";

  return (
    <main className={`min-h-dvh max-w-full overflow-x-hidden bg-[#101114] text-[#e1e2ec] antialiased selection:bg-[#f7bc5f] selection:text-[#101114] lg:pl-72 ${showSignupCredits ? "pb-[calc(16rem+env(safe-area-inset-bottom))]" : flushContent ? "pb-0" : "pb-28"} ${hideHeader ? "pt-0" : "pt-20"}`}>
      {hasSignupAccess && <SignupCreditRefresh remaining={signupCredits.remaining} pending={signupCredits.pending} />}
      {!hideHeader && (
        <header className="fixed left-0 top-0 z-40 flex h-16 w-full max-w-full items-center justify-between gap-3 overflow-hidden border-b border-white/10 bg-[#101114] px-4 shadow-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <MobileOwnerNav active={active} isSaasAdmin={owner?.role === "saas_admin"} />
            <Link href="/owner" className="flex h-10 min-w-0 items-center">
              <Image src="/new-landing/growjewelry-logo.png" alt="Grow Jewelry" width={200} height={56} className="h-11 w-auto object-contain" style={{ mixBlendMode: "screen", verticalAlign: "middle" }} priority />
            </Link>
          </div>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-[#17191F] text-xs font-bold text-[#D1B873]">
            {initialsFor(ownerUser?.name, owner?.email)}
          </div>
        </header>
      )}

      <aside className={`fixed left-0 top-0 z-30 hidden h-full w-72 flex-col border-r border-white/5 bg-[#17191F] px-2 py-6 shadow-2xl lg:flex ${hideHeader ? "pt-6" : "pt-20"}`}>
        <div className="mb-8 px-4">
          <h2 className="truncate text-xl font-bold text-[#f7bc5f]">{ownerAccount?.name ?? "Your studio"}</h2>
          <p className="mt-1 truncate text-sm text-[#c2c6d6]">{ownerUser?.name ?? owner?.email ?? "Owner"}</p>
          <span className="mt-3 inline-block rounded border border-[#dec47e]/20 bg-[#56450a]/50 px-2 py-1 text-[11px] text-[#dec47e]">{accountBadge}</span>
        </div>
        <nav className="flex flex-col gap-2">
          {ownerNav(owner?.role === "saas_admin").map(item => {
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
        <form action="/api/auth/logout" method="post" className="mt-auto px-2">
          <button className="w-full rounded-lg border border-white/10 px-4 py-3 text-left text-sm text-[#c2c6d6] transition hover:bg-white/5">
            Log out
          </button>
        </form>
      </aside>

      {entitlement?.isInPaymentGrace && !hideHeader && (
        <div className="mx-auto mb-5 w-full max-w-5xl px-4 md:px-6">
          <div className="border border-[#ef4444]/40 bg-[#3b1717] px-4 py-3 text-sm font-semibold text-[#fecaca]">
            Payment failed. Update your billing method within 2 days to keep account access and storefront visibility.
            <Link href="/owner/account" className="ml-2 underline">Update payment</Link>
          </div>
        </div>
      )}

      {entitlement && !entitlement.canUsePaidFeatures && !canUseSignupDashboard && !["Account", "Settings", "Profile"].includes(active) ? (
        <div className="relative isolate min-h-[calc(100dvh-5rem)]">
          <div inert aria-hidden="true" className="pointer-events-none select-none opacity-60 blur-[1px]">
            {children}
          </div>
          <div className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(16,17,20,0.08)_0%,rgba(16,17,20,0.38)_38%,rgba(16,17,20,0.82)_100%)]">
            <div className="sticky top-24 flex justify-center px-5 pb-16 pt-[clamp(5rem,14vh,9rem)] sm:px-8">
              <section aria-labelledby="subscription-required-title" className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#e8c992]/25 bg-[#17191F] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-9">
                <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-[#edcc91]/20 bg-[#f7bc5f]/10 text-[#e8c992]">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
                    <rect x="5" y="10" width="14" height="11" rx="3" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" strokeLinecap="round" />
                  </svg>
                </div>
                <h1 id="subscription-required-title" className="text-2xl font-semibold tracking-tight text-[#f5f0e7]">Subscription required</h1>
                <p className="mt-3 text-sm leading-6 text-[#c3c0bb]">Your store is ready. Start or restore your subscription to use your dashboard.</p>
                <Link href="/owner/account" className="mt-7 flex h-12 w-full items-center justify-center rounded-lg bg-[#f7bc5f] text-sm font-semibold text-[#21180b] shadow-[0_4px_18px_rgba(247,188,95,0.12)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f7cd83]">Manage billing</Link>
                {canStartTrial && <Link href="/owner/account#subscription-plans" className="mt-3 flex h-11 w-full items-center justify-center rounded-lg border border-[#60baff]/40 bg-[radial-gradient(ellipse_90%_230%_at_50%_115%,#65d5ff_0%,#167be0_32%,#19283e_72%,#17191f_100%)] text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(151,218,255,0.25),0_4px_18px_rgba(36,150,255,0.16)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#65d5ff]">Start {TRIAL_DAYS} day trial</Link>}
                <p className="mt-4 text-center text-xs leading-5 text-[#96938e]">Your designs and quotes stay saved.</p>
              </section>
            </div>
          </div>
        </div>
      ) : children}
      {showSignupCredits && (
        <div data-signup-credit-banner className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-[linear-gradient(to_top,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0.9)_55%,rgba(0,0,0,0)_100%)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 lg:left-72">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 text-center">
            <div className="min-w-0">
              <p className="text-lg font-semibold text-[#f5f0e7]"><span className="text-[#65d5ff]">{signupCredits.remaining}</span> free {signupCredits.remaining === 1 ? "generation" : "generations"} left</p>
              <p className="mt-2 text-xs text-[#969eaf]">{signupCredits.pending > 0 ? "Your designs are generating. Your results will stay saved." : "Explore your first designs. No card needed."}</p>
              <div aria-hidden="true" className="mt-4 flex justify-center gap-1.5">{Array.from({ length: 5 }, (_, i) => <span key={i} className={`h-1 w-6 rounded-full ${i < signupCredits.remaining ? "bg-[#65d5ff]" : "bg-white/15"}`} />)}</div>
            </div>
            <Link href="/owner/account" className="pointer-events-auto flex h-11 shrink-0 items-center justify-center rounded-lg border border-[#e8c992]/25 px-6 text-sm font-semibold text-[#f7bc5f] transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f7bc5f]">Manage billing</Link>
          </div>
        </div>
      )}
    </main>
  );
}
