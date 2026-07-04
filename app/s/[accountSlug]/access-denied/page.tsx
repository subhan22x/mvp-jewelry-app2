import Link from "next/link";
import { prisma } from "@/server/db/client";

export const dynamic = "force-dynamic";

export default async function StorefrontAccessDeniedPage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const account = await prisma.account.findUnique({
    where: { slug: accountSlug },
    select: {
      name: true,
      StoreProfile: { select: { displayName: true } },
    },
  });
  const displayName = account?.StoreProfile?.displayName ?? account?.name ?? "This store";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#151311] px-5 text-[#F5F0E8]">
      <section className="w-full max-w-md border border-[#342E26] bg-[#1C1915] p-7 shadow-2xl shadow-black/40">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#D1B873]">Access denied</p>
        <h1 className="mt-4 text-3xl font-black tracking-normal">{displayName} is not available right now.</h1>
        <p className="mt-4 text-sm leading-6 text-[#B9B0A3]">
          This storefront is temporarily unavailable. Please contact the store directly or try again later.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex h-11 items-center justify-center border border-[#D1B873]/45 px-5 text-sm font-bold text-[#F4D38A] transition hover:bg-[#D1B873]/10"
        >
          Back to Grow Jewelry
        </Link>
      </section>
    </main>
  );
}
