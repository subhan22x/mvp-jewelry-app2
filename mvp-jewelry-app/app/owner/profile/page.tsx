import Link from "next/link";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import OwnerFrame from "../OwnerFrame";
import OwnerLoginForm from "../OwnerLoginForm";
import { isOwnerAuthenticated } from "../_auth";

export const dynamic = "force-dynamic";

export default async function OwnerProfilePage() {
  if (!isOwnerAuthenticated()) return <OwnerLoginForm />;

  const accountId = getDefaultAccountId();
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: { StoreProfile: true, StoreServices: { orderBy: [{ sortOrder: "asc" }] } }
  });

  return (
    <OwnerFrame active="Profile">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 md:px-6">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Profile</h1>
            <p className="mt-2 text-[15px] text-[#c2c6d6]">Public storefront profile shown at your bio link.</p>
          </div>
          {account && <Link href={`/s/${account.slug}`} className="rounded-full border border-white/10 px-4 py-2 text-sm text-[#c2c6d6] hover:bg-white/10">View public page</Link>}
        </section>

        <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="overflow-hidden rounded-xl border border-white/5 bg-[#17191F]">
            <div className="h-36 bg-black">
              {account?.StoreProfile?.coverImageUrl ? <img src={account.StoreProfile.coverImageUrl} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="p-4">
              <div className="-mt-12 h-24 w-24 overflow-hidden rounded-2xl border-4 border-[#17191F] bg-[#272a31]">
                {account?.StoreProfile?.profileImageUrl ? <img src={account.StoreProfile.profileImageUrl} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <h2 className="mt-3 text-xl font-bold">{account?.StoreProfile?.displayName ?? account?.name ?? "Store profile"}</h2>
              <p className="mt-1 text-sm text-[#8c909f]">@{account?.StoreProfile?.instagramHandle ?? "instagram"}</p>
              <p className="mt-3 text-sm leading-6 text-[#c2c6d6]">{account?.StoreProfile?.headline ?? "Add a tagline for your public profile."}</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#17191F] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#f7bc5f]">Profile editor</p>
            <h2 className="mt-3 text-2xl font-bold">Editing scaffold</h2>
            <p className="mt-2 text-sm leading-6 text-[#8c909f]">Next step is wiring forms for cover photo, profile image, WhatsApp number, services, and publish state.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {account?.StoreServices.map(service => (
                <div key={service.id} className="rounded-lg border border-white/5 bg-[#101114] px-3 py-2">
                  <p className="text-sm font-semibold">{service.title}</p>
                  <p className="text-xs text-[#8c909f]">{service.isActive ? "Visible" : "Hidden"}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </OwnerFrame>
  );
}
