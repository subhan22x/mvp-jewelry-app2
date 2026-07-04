import Link from "next/link";
import QuoteForm from "./QuoteForm";
import { requirePublicTenantPage } from "@/src/lib/tenant-page";

export const dynamic = "force-dynamic";

export default async function StoreQuotePage({ params }: { params: Promise<{ accountSlug: string }> }) {
  const { accountSlug } = await params;
  const tenant = await requirePublicTenantPage(accountSlug);

  return (
    <main className="min-h-screen bg-[#151311] text-[#F5F0E8]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] px-5 py-5">
        <div className="mb-8 flex items-center justify-between">
          <Link href={`/s/${tenant.accountSlug}`} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#342E26] bg-[#1C1915] text-xl">
            ←
          </Link>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.24em] text-[#8D8377]">Quote Request</p>
            <p className="mt-1 text-sm font-bold">{tenant.displayName}</p>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-normal">Send your idea.</h1>
          <p className="mt-3 text-base leading-7 text-[#9E9589]">Upload reference photos and tell the store what you want made or sourced.</p>
        </div>

        <QuoteForm accountSlug={tenant.accountSlug} storeName={tenant.displayName} />
      </div>
    </main>
  );
}
