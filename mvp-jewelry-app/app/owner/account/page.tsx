import { cookies } from "next/headers";
import Link from "next/link";
import { isOwnerSessionValue, OWNER_SESSION_COOKIE } from "@/src/lib/owner-auth";
import { getNamePromptMode } from "@/src/lib/prompt-mode";
import OwnerLoginForm from "../OwnerLoginForm";
import PromptModeForm from "../PromptModeForm";

export const dynamic = "force-dynamic";

export default async function OwnerAccountPage() {
  const cookieValue = cookies().get(OWNER_SESSION_COOKIE)?.value;
  if (!isOwnerSessionValue(cookieValue)) {
    return <OwnerLoginForm />;
  }

  const promptMode = await getNamePromptMode();

  return (
    <main className="min-h-dvh max-w-full overflow-x-hidden bg-[#101114] pb-16 pt-20 text-[#e1e2ec] antialiased selection:bg-[#f7bc5f] selection:text-[#101114] lg:pl-72">
      <header className="fixed left-0 top-0 z-40 flex h-16 w-full max-w-full items-center justify-between gap-3 overflow-hidden border-b border-white/10 bg-[#101114] px-4 shadow-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-[#f7bc5f]" aria-hidden>*</span>
          <span className="truncate text-base font-bold tracking-tight text-[#f7bc5f] sm:text-lg">Jewelry Design Studio</span>
        </div>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/20 bg-[#17191F] text-xs font-bold text-[#D1B873]">
          JS
        </div>
      </header>

      <aside className="fixed left-0 top-0 z-30 hidden h-full w-72 flex-col border-r border-white/5 bg-[#17191F] px-2 py-6 pt-20 shadow-2xl lg:flex">
        <div className="mb-8 px-4">
          <h2 className="text-xl font-bold text-[#f7bc5f]">Luxe Jewelry Admin</h2>
          <p className="mt-1 text-sm text-[#c2c6d6]">Global Manager</p>
          <span className="mt-3 inline-block rounded border border-[#dec47e]/20 bg-[#56450a]/50 px-2 py-1 text-[11px] text-[#dec47e]">Premium Tier</span>
        </div>
        {[
          { label: "Quotes", href: "/owner" },
          { label: "Customers", href: "#" },
          { label: "Account", href: "/owner/account" }
        ].map(item => (
          <Link
            key={item.label}
            href={item.href}
            className={`mx-2 flex items-center gap-3 rounded-lg px-4 py-3 transition ${
              item.label === "Account" ? "translate-x-1 bg-[#56450a] text-[#dec47e]" : "text-[#c2c6d6] hover:bg-white/5"
            }`}
          >
            <span aria-hidden>{item.label === "Account" ? "*" : "o"}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </aside>

      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-8 px-4 md:px-6">
        <section className="min-w-0">
          <Link href="/owner" className="text-sm text-[#adc6ff] hover:text-white">Back to quotes</Link>
          <h1 className="mt-3 text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Account</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Manage owner-level settings for the admin panel.</p>
        </section>

        <PromptModeForm initialMode={promptMode} />
      </div>
    </main>
  );
}
