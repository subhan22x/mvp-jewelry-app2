import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/client";

export const dynamic = "force-dynamic";

type StorefrontPageProps = {
  params: {
    accountSlug: string;
  };
};

function normalizeHandle(handle: string | null | undefined) {
  if (!handle) return null;
  return handle.replace(/^@/, "");
}

function phoneHref(phone: string | null | undefined, mode: "sms" | "tel" = "sms") {
  if (!phone) return null;
  return `${mode}:${phone.replace(/[^\d+]/g, "")}`;
}

function whatsappHref(phone: string | null | undefined) {
  if (!phone) return null;
  return `https://wa.me/${phone.replace(/[^\d]/g, "")}`;
}

function serviceHref(service: { kind: string; href: string | null }, accountSlug: string, phone: string | null | undefined, whatsappPhone?: string | null) {
  if (service.kind === "design_custom") return `/name?account=${accountSlug}`;
  if (service.kind === "quote") return `/s/${accountSlug}/quote`;
  if (service.kind === "message") return whatsappHref(whatsappPhone) ?? phoneHref(phone, "sms") ?? service.href ?? "#";
  if (service.kind === "appointment") return service.href ?? phoneHref(phone, "tel") ?? "#";
  return service.href ?? "#";
}

async function getProfile(accountSlug: string) {
  return prisma.account.findUnique({
    where: { slug: accountSlug },
    include: {
      StoreProfile: true,
      StoreServices: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      ProductCollections: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          Products: {
            where: { isActive: true },
            orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      }
    }
  });
}

export async function generateMetadata({ params }: StorefrontPageProps) {
  const account = await getProfile(params.accountSlug);
  const profile = account?.StoreProfile;
  if (!account || !profile?.isPublished) return { title: "Store profile" };

  return {
    title: `${profile.displayName} | Custom Jewelry`,
    description: profile.headline ?? profile.bio ?? `Design custom jewelry with ${profile.displayName}.`
  };
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const account = await getProfile(params.accountSlug);
  const profile = account?.StoreProfile;
  if (!account || !profile?.isPublished) notFound();

  const instagramHandle = normalizeHandle(profile.instagramHandle);
  const messageHref = whatsappHref(profile.whatsappPhone) ?? phoneHref(profile.phone, "sms");
  const collections = account.ProductCollections.filter(collection => collection.Products.length > 0);
  const featuredProduct = collections.flatMap(collection => collection.Products).find(product => product.isFeatured);

  return (
    <main className="min-h-screen bg-[#151311] text-[#F5F0E8]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#181512] shadow-2xl shadow-black/40">
        <section className="relative">
          <div className="relative h-40 overflow-hidden rounded-b-[2rem] bg-[#24201A]">
            {profile.coverImageUrl ? (
              <img src={profile.coverImageUrl} alt="" className="h-full w-full object-cover opacity-90" />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,#8B5E22,transparent_34%),linear-gradient(135deg,#2A2015,#171511)]" />
            )}
            <div className="absolute inset-0 bg-black" style={{ opacity: Math.min(Math.max(profile.coverOverlayOpacity, 0), 85) / 100 }} />
          </div>
          <div className="px-5">
            <div className="-mt-10 flex items-end justify-between gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-[1.7rem] border-4 border-[#181512] bg-[#24201A]">
                {profile.profileImageUrl ? (
                  <img src={profile.profileImageUrl} alt={`${profile.displayName} profile`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-black text-[#D3A84F]">
                    {profile.displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              {messageHref && (
                <a href={messageHref} className="mb-2 rounded-full bg-[#F5F0E8] px-5 py-3 text-sm font-bold text-black hover:bg-[#D3A84F]">
                  Message
                </a>
              )}
            </div>

            <div className="mt-4">
              <h1 className="text-2xl font-black tracking-normal">{profile.displayName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                {instagramHandle && (
                  <a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noreferrer" className="hover:text-white">
                    @{instagramHandle}
                  </a>
                )}
                {profile.city && <span>{profile.city}{profile.country ? `, ${profile.country}` : ""}</span>}
                {profile.headline && <span>{profile.headline}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.verificationLabel && (
                  <span className="rounded-full bg-[#2D2417] px-3 py-1 text-xs font-bold text-[#D3A84F]">{profile.verificationLabel}</span>
                )}
                {profile.statusLabel && (
                  <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">{profile.statusLabel}</span>
                )}
              </div>
              {profile.bio && <p className="mt-4 text-sm leading-6 text-[#B7AEA2]">{profile.bio}</p>}
            </div>
          </div>
        </section>

        <section className="px-5 pt-6">
          <div className="grid grid-cols-2 gap-3">
            {account.StoreServices.map(service => (
              <a
                key={service.id}
                href={serviceHref(service, account.slug, profile.phone, profile.whatsappPhone)}
                className="flex min-h-12 items-center justify-center rounded-full bg-[#24201A] px-4 text-center text-sm font-semibold text-[#F5F0E8] hover:bg-[#30291F]"
              >
                {service.ctaLabel}
              </a>
            ))}
          </div>
        </section>

        {featuredProduct && (
          <section className="px-5 pt-7">
            <div className="relative h-56 overflow-hidden rounded-2xl bg-[#24201A]">
              <img src={featuredProduct.imageUrl} alt={featuredProduct.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
              <div className="absolute left-4 top-4 rounded-full bg-[#2D2417]/90 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#D3A84F]">
                {featuredProduct.badgeLabel ?? "Featured"}
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-xl font-black">{featuredProduct.name}</h2>
                {featuredProduct.description && <p className="mt-1 text-sm text-zinc-300">{featuredProduct.description}</p>}
              </div>
            </div>
          </section>
        )}

        <section className="px-5 py-7">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-sm font-black uppercase tracking-[0.22em]">Collection</h2>
            <Link href={`/name?account=${account.slug}`} className="text-xs font-bold text-[#D3A84F] hover:text-white">
              Design Custom
            </Link>
          </div>

          <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1">
            <a href="#all-products" className="shrink-0 rounded-full border border-white/10 bg-white px-4 py-2 text-xs font-bold text-black">
              All
            </a>
            {collections.map(collection => (
              <a key={collection.id} href={`#${collection.slug}`} className="shrink-0 rounded-full border border-[#342E26] bg-[#1C1915] px-4 py-2 text-xs font-bold uppercase text-[#B7AEA2]">
                {collection.title}
              </a>
            ))}
          </div>

          <div id="all-products" className="space-y-8">
            {collections.map(collection => (
              <div key={collection.id} id={collection.slug} className="scroll-mt-6">
                <div className="mb-3 flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black">{collection.title}</h3>
                    {collection.description && <p className="mt-1 text-sm text-zinc-400">{collection.description}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {collection.Products.map(product => (
                    <a key={product.id} href={product.href ?? messageHref ?? "#"} className="group block overflow-hidden rounded-2xl bg-[#211D18]">
                      <div className="aspect-square overflow-hidden bg-[#24201A]">
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      </div>
                      <div className="p-3">
                        <div className="flex min-h-10 items-start justify-between gap-2">
                          <p className="text-sm font-bold leading-5">{product.name}</p>
                          {product.isFeatured && <span className="rounded-full bg-[#D3A84F] px-2 py-0.5 text-[10px] font-black text-black">Hot</span>}
                        </div>
                        {product.priceLabel && <p className="mt-1 text-xs font-bold text-[#D3A84F]">{product.priceLabel}</p>}
                        {product.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8D8377]">{product.description}</p>}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
