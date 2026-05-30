import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  await prisma.account.upsert({
    where: { id: "demo-account" },
    update: {
      name: "Demo Store",
      slug: "demo"
    },
    create: {
      id: "demo-account",
      name: "Demo Store",
      slug: "demo"
    }
  });

  await prisma.user.upsert({
    where: { id: "demo" },
    update: {
      storeName: "Demo Store",
      role: "store_owner"
    },
    create: {
      id: "demo",
      storeName: "Demo Store",
      name: "Demo Store Owner",
      role: "store_owner"
    }
  });

  await prisma.accountMembership.upsert({
    where: {
      accountId_userId: {
        accountId: "demo-account",
        userId: "demo"
      }
    },
    update: {
      role: "owner",
      status: "active"
    },
    create: {
      id: "demo-account-owner",
      accountId: "demo-account",
      userId: "demo",
      role: "owner",
      status: "active"
    }
  });

  await prisma.storeProfile.upsert({
    where: { accountId: "demo-account" },
    update: {
      displayName: "IceKing London",
      headline: "Custom jewelry, pendants, watches, and quote requests.",
      bio: "Send inspiration, design a custom pendant, or browse featured pieces.",
      profileImageUrl: "/pendants/gatti.png",
      coverImageUrl: "/samples/JWAE-Custom-Moissanite-Name-Pendant-14K-Gold-icecartel-white.png",
      coverPreset: "dark_gold",
      coverOverlayOpacity: 27,
      coverTextColor: "light",
      phone: "+15555550123",
      whatsappPhone: "+15555550123",
      instagramHandle: "icekinglondon",
      city: "London",
      country: "United Kingdom",
      yearStarted: "2018",
      statusLabel: "Taking Orders",
      verificationLabel: "VVS Verified",
      isPublished: true
    },
    create: {
      id: "demo-store-profile",
      accountId: "demo-account",
      displayName: "IceKing London",
      headline: "Custom jewelry, pendants, watches, and quote requests.",
      bio: "Send inspiration, design a custom pendant, or browse featured pieces.",
      profileImageUrl: "/pendants/gatti.png",
      coverImageUrl: "/samples/JWAE-Custom-Moissanite-Name-Pendant-14K-Gold-icecartel-white.png",
      coverPreset: "dark_gold",
      coverOverlayOpacity: 27,
      coverTextColor: "light",
      phone: "+15555550123",
      whatsappPhone: "+15555550123",
      instagramHandle: "icekinglondon",
      city: "London",
      country: "United Kingdom",
      yearStarted: "2018",
      statusLabel: "Taking Orders",
      verificationLabel: "VVS Verified",
      isPublished: true
    }
  });

  const services = [
    { id: "demo-service-quote", title: "Get Quote", kind: "quote", ctaLabel: "Get Quote", href: "/picture-pendants", sortOrder: 0 },
    { id: "demo-service-custom", title: "Design Custom", kind: "design_custom", ctaLabel: "Design Custom", href: "/name", sortOrder: 1 },
    { id: "demo-service-size-guide", title: "Size Guide", kind: "size_guide", ctaLabel: "Size Guide", href: null, sortOrder: 2, isActive: false },
    { id: "demo-service-sell-watch", title: "Sell Watch", kind: "sell_watch", ctaLabel: "Sell Watch", href: null, sortOrder: 3, isActive: false },
    { id: "demo-service-appointment", title: "Book Appt", kind: "appointment", ctaLabel: "Book Appt", href: "tel:+15555550123", sortOrder: 4 },
    { id: "demo-service-message", title: "Message", kind: "message", ctaLabel: "Message", href: "sms:+15555550123", sortOrder: 5 }
  ];

  for (const service of services) {
    await prisma.storeService.upsert({
      where: { id: service.id },
      update: { ...service, accountId: "demo-account", isActive: service.isActive ?? true },
      create: { ...service, accountId: "demo-account", isActive: service.isActive ?? true }
    });
  }

  const collections = [
    { id: "demo-collection-pendants", title: "Pendants", slug: "pendants", sortOrder: 0 },
    { id: "demo-collection-watches", title: "Watches", slug: "watches", sortOrder: 1 },
    { id: "demo-collection-chains", title: "Chains", slug: "chains", sortOrder: 2 },
    { id: "demo-collection-rings", title: "Rings", slug: "rings", sortOrder: 3 }
  ];

  for (const collection of collections) {
    await prisma.productCollection.upsert({
      where: { accountId_slug: { accountId: "demo-account", slug: collection.slug } },
      update: { ...collection, accountId: "demo-account", isActive: true },
      create: { ...collection, accountId: "demo-account", isActive: true }
    });
  }

  const products = [
    {
      id: "demo-product-ryder",
      collectionId: "demo-collection-pendants",
      name: "Ryder Pendant",
      slug: "ryder-pendant",
      description: "Ask for iced name pendant pricing.",
      imageUrl: "/samples/JWAE-Custom-Moissanite-Name-Pendant-14K-Gold-icecartel-white.png",
      badgeLabel: "Featured",
      variantLabelsJson: JSON.stringify(["14K Gold", "With chain"]),
      isFeatured: true,
      sortOrder: 0
    },
    {
      id: "demo-product-gatti",
      collectionId: "demo-collection-pendants",
      name: "Gatti Pendant",
      slug: "gatti-pendant",
      description: "Custom pendant design starter.",
      imageUrl: "/pendants/gatti.png",
      variantLabelsJson: JSON.stringify(["10K Gold", "18K Gold"]),
      sortOrder: 1
    },
    {
      id: "demo-product-king",
      collectionId: "demo-collection-pendants",
      name: "King Pendant",
      slug: "king-pendant",
      description: "Bold block name pendant.",
      imageUrl: "/pendants/king.png",
      variantLabelsJson: JSON.stringify(["Silver"]),
      sortOrder: 2
    },
    {
      id: "demo-product-watch-skeleton",
      collectionId: "demo-collection-watches",
      name: "Skeleton Watch",
      slug: "skeleton-watch",
      description: "Send a photo to request similar sourcing.",
      imageUrl: "/samples/King slanted.png",
      variantLabelsJson: JSON.stringify([]),
      sortOrder: 0
    }
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { accountId_slug: { accountId: "demo-account", slug: product.slug } },
      update: { ...product, accountId: "demo-account", isActive: true },
      create: { ...product, accountId: "demo-account", isActive: true }
    });
  }
  console.log("Seeded demo account and owner.");
} finally {
  await prisma.$disconnect();
}
