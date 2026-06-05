import { notFound } from "next/navigation";
import { prisma } from "@/server/db/client";
import StorefrontCollections from "./StorefrontCollections";

export const dynamic = "force-dynamic";

type StorefrontPageProps = {
  params: Promise<{
    accountSlug: string;
  }>;
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

function normalizeUrl(value: string | null | undefined) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function parseExtraLinks(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as Array<{ label?: string; url?: string }>;
    return parsed
      .filter(link => link.label && link.url)
      .slice(0, 2)
      .map(link => ({ label: link.label!, url: normalizeUrl(link.url!) ?? "#" }));
  } catch {
    return [];
  }
}

function formatAddress(profile: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}) {
  const region = [profile.state, profile.postalCode].filter(Boolean).join(" ");
  const locality = [profile.city, region].filter(Boolean).join(", ");
  return [profile.addressLine1, profile.addressLine2, locality, profile.country].filter(Boolean).join(", ");
}

async function getProfile(accountSlug: string) {
  return prisma.account.findUnique({
    where: { slug: accountSlug },
    include: {
      StoreProfile: true,
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
  const { accountSlug } = await params;
  const account = await getProfile(accountSlug);
  const profile = account?.StoreProfile;
  if (!account || account.status !== "active" || !profile?.isPublished) return { title: "Store profile" };

  return {
    title: `${profile.displayName} | Custom Jewelry`,
    description: profile.headline ?? profile.bio ?? `Design custom jewelry with ${profile.displayName}.`
  };
}

export default async function StorefrontPage({ params }: StorefrontPageProps) {
  const { accountSlug } = await params;
  const account = await getProfile(accountSlug);
  const profile = account?.StoreProfile;
  if (!account || account.status !== "active" || !profile?.isPublished) notFound();

  const instagramHandle = normalizeHandle(profile.instagramHandle);
  const messageHref = whatsappHref(profile.whatsappPhone) ?? phoneHref(profile.phone, "sms");
  const instagramHref = instagramHandle ? `https://instagram.com/${instagramHandle}` : null;
  const extraLinks = parseExtraLinks(profile.extraLinksJson);
  const address = formatAddress(profile);
  const collections = account.ProductCollections.filter(collection => collection.Products.length > 0);
  const products = collections.flatMap(collection => collection.Products.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    imageUrl: product.imageUrl,
    href: product.href,
    priceLabel: product.priceLabel,
    material: product.material,
    metalDetail: product.metalDetail,
    stoneQuality: product.stoneQuality,
    weightLabel: product.weightLabel,
    badgeLabel: product.badgeLabel,
    isFeatured: product.isFeatured,
    category: product.category,
    collectionSlug: collection.slug,
  })));

  return (
    <main className="min-h-screen bg-[#050504] text-[#ede4d4]">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-[#050504] shadow-2xl shadow-black/40">
        <section className="relative">
          <div className="px-5 pt-8">
            <div className="flex items-end justify-between gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-[1.7rem] border border-[rgba(237,228,212,.12)] bg-[#15120d]">
                {profile.profileImageUrl ? (
                  <img src={profile.profileImageUrl} alt={`${profile.displayName} profile`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-black text-[#ebb467]">
                    {profile.displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <h1 className="text-2xl font-black tracking-normal">{profile.displayName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-[#91877b]">
                {instagramHandle && (
                  <a href={`https://instagram.com/${instagramHandle}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-white">
                    <InstagramMiniIcon />
                    @{instagramHandle}
                  </a>
                )}
                {profile.phone && <span className="inline-flex items-center gap-1.5"><PhoneMiniIcon />{profile.phone}</span>}
                {address && <span className="inline-flex items-center gap-1.5"><LocationMiniIcon />{address}</span>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.verificationLabel && (
                  <span className="rounded-full bg-[rgba(212,146,74,.16)] px-3 py-1 text-xs font-bold text-[#ebb467]">{profile.verificationLabel}</span>
                )}
                {profile.statusLabel && (
                  <span className="rounded-full bg-[rgba(237,228,212,.08)] px-3 py-1 text-xs font-bold text-[#ede4d4]">{profile.statusLabel}</span>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pt-8 pb-3">
          <div className="grid grid-cols-2 gap-3">
            <ProfileButton href={`/s/${account.slug}/review`} label="Reviews" />
            {messageHref && <ProfileButton href={messageHref} label="Message" variant="gold" />}
            {instagramHref && <ProfileButton href={instagramHref} label="Instagram" external />}
            <ProfileButton href={`/name?account=${account.slug}`} label="Design Custom" />
          </div>
          {extraLinks.length > 0 && (
            <div className="mt-3 grid gap-2">
              {extraLinks.map(link => (
                <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="grid min-h-11 grid-cols-[1.5rem_1fr_1.5rem] items-center rounded-full border border-[rgba(237,228,212,.24)] bg-[#120f0c] px-4 text-sm font-semibold text-[#ede4d4] shadow-[inset_0_0_0_1px_rgba(235,180,103,.08)] hover:border-[rgba(235,180,103,.52)]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full">
                    <GlobeMiniIcon />
                  </span>
                  <span className="truncate text-center">{link.label}</span>
                  <span aria-hidden />
                </a>
              ))}
            </div>
          )}
        </section>

        <StorefrontCollections products={products} fallbackHref={messageHref ?? "#"} />
      </div>
    </main>
  );
}

function ProfileButton({
  href,
  label,
  external = false,
  variant = "default",
}: {
  href: string;
  label: string;
  external?: boolean;
  variant?: "default" | "gold";
}) {
  const className = variant === "gold"
    ? "flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(165deg,#ebb467,#d4924a)] px-4 text-center text-sm font-semibold text-[#1b1006] shadow-[0_10px_24px_-12px_rgba(212,146,74,.8)]"
    : "flex min-h-12 items-center justify-center rounded-full bg-[#221d17] px-4 text-center text-sm font-semibold text-[#f4eadc] ring-1 ring-[rgba(237,228,212,.14)] hover:bg-[#2a231b] hover:ring-[rgba(235,180,103,.36)]";

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={className}
    >
      {label}
    </a>
  );
}

function InstagramMiniIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#d4924a]">
      <rect x="4" y="4" width="16" height="16" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.7" cy="7.3" r="1" fill="currentColor" />
    </svg>
  );
}

function GlobeMiniIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 text-[#d4924a]">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M3.8 12h16.4M12 3.5c2.2 2.3 3.4 5.1 3.4 8.5S14.2 18.2 12 20.5C9.8 18.2 8.6 15.4 8.6 12S9.8 5.8 12 3.5Z" />
    </svg>
  );
}

function PhoneMiniIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#d4924a]">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M6.6 3.8 9.2 3l2 4.8-1.7 1.1c.9 1.9 2.4 3.4 4.5 4.6l1.2-1.7 4.8 2.1-.8 2.7c-.3 1-1.2 1.6-2.2 1.5C9.5 17.5 4.8 12.8 4.2 5.3c-.1-1 .5-1.9 1.4-2.2Z" />
    </svg>
  );
}

function LocationMiniIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#d4924a]">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}
