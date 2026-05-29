import { notFound } from "next/navigation";
import { prisma } from "@/server/db/client";
import ReviewForm from "./ReviewForm";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { accountSlug: string };
};

export default async function PublicReviewPage({ params }: PageProps) {
  const account = await prisma.account.findUnique({
    where: { slug: params.accountSlug },
    select: {
      slug: true,
      name: true,
      StoreProfile: {
        select: {
          displayName: true,
          profileImageUrl: true,
          isPublished: true,
        },
      },
    },
  });
  if (!account || !account.StoreProfile?.isPublished) notFound();

  const displayName = account.StoreProfile.displayName || account.name;

  return (
    <main className="min-h-screen bg-[#151311] text-[#F5F0E8]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#181512] px-6 py-6 shadow-2xl shadow-black/40">
        <a href={`/s/${account.slug}`} className="mb-7 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#24201A] text-xl text-[#F5F0E8] hover:bg-[#30291F]">
          ←
        </a>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 overflow-hidden rounded-2xl border border-[#342E26] bg-[#24201A]">
            {account.StoreProfile.profileImageUrl ? (
              <img src={account.StoreProfile.profileImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="m-auto text-xl font-black text-[#D3A84F]">{displayName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D3A84F]">Leave a review</p>
            <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight">{displayName}</h1>
          </div>
        </div>
        <p className="mt-7 text-sm leading-6 text-[#8D8377]">
          Rate your experience and share a few words for future customers.
        </p>
        <ReviewForm accountSlug={account.slug} />
      </div>
    </main>
  );
}
