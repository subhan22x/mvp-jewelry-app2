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
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#181512] px-5 py-8 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 overflow-hidden rounded-2xl border border-[#342E26] bg-[#24201A]">
            {account.StoreProfile.profileImageUrl ? (
              <img src={account.StoreProfile.profileImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="m-auto text-xl font-black text-[#D3A84F]">{displayName.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#D3A84F]">Review</p>
            <h1 className="mt-1 text-2xl font-black">{displayName}</h1>
          </div>
        </div>
        <p className="mt-6 text-sm leading-6 text-[#B7AEA2]">
          Share your experience so future customers know what to expect.
        </p>
        <ReviewForm accountSlug={account.slug} />
      </div>
    </main>
  );
}
