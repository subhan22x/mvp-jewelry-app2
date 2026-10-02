import { requirePlatformAdmin } from "@/src/lib/auth/platform-admin";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  return (
    <main className="min-h-dvh bg-[#101114] text-[#e1e2ec] lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="border-b border-white/10 bg-[#17191F] p-5 lg:min-h-dvh lg:border-b-0 lg:border-r">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#f7bc5f]">Grow Jewelry</p>
        <h1 className="mt-2 text-xl font-bold">Platform Admin</h1>
        <nav className="mt-7 flex gap-2 lg:flex-col">
          <Link className="rounded-lg bg-[#56450a] px-4 py-3 text-sm font-semibold text-[#f7bc5f]" href="/admin/qr-kits">
            QR Attribution
          </Link>
        </nav>
      </aside>
      {children}
    </main>
  );
}
