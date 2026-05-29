import Link from "next/link";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import OwnerFrame from "../OwnerFrame";
import OwnerLoginForm from "../OwnerLoginForm";
import { isOwnerAuthenticated } from "../_auth";
import ProfileEditor from "./ProfileEditor";

export const dynamic = "force-dynamic";

function parseExtraLinks(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as Array<{ label?: string; url?: string }>;
    return parsed
      .filter(link => link.label && link.url)
      .slice(0, 2)
      .map(link => ({ label: link.label!, url: link.url! }));
  } catch {
    return [];
  }
}

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

        {account && (
          <ProfileEditor
            publicUrl={`/s/${account.slug}`}
            displayName={account.StoreProfile?.displayName ?? account.name}
            headline={account.StoreProfile?.headline ?? ""}
            profileImageUrl={account.StoreProfile?.profileImageUrl ?? null}
            instagramHandle={account.StoreProfile?.instagramHandle ?? ""}
            phone={account.StoreProfile?.phone ?? account.StoreProfile?.whatsappPhone ?? ""}
            websiteUrl={account.StoreProfile?.websiteUrl ?? ""}
            addressLine1={account.StoreProfile?.addressLine1 ?? ""}
            addressLine2={account.StoreProfile?.addressLine2 ?? ""}
            city={account.StoreProfile?.city ?? ""}
            state={account.StoreProfile?.state ?? ""}
            postalCode={account.StoreProfile?.postalCode ?? ""}
            country={account.StoreProfile?.country ?? ""}
            extraLinks={parseExtraLinks(account.StoreProfile?.extraLinksJson)}
          />
        )}
      </div>
    </OwnerFrame>
  );
}
