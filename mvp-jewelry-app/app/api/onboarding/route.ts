import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { hashPassword } from "@/src/lib/auth/password";
import { savePublicUpload } from "@/src/lib/storage/public-media";
import { slugify } from "@/src/lib/slug";

export const dynamic = "force-dynamic";

const serviceSchema = z.object({
  kind: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  ctaLabel: z.string().min(1),
  href: z.string().optional().nullable(),
  isActive: z.boolean().default(false),
  sortOrder: z.number().int().default(0)
});

const productSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  priceMode: z.enum(["set", "ask"]).default("ask"),
  priceLabel: z.string().optional(),
  variantLabels: z.array(z.string()).default([])
});

const onboardingSchema = z.object({
  businessName: z.string().min(2),
  city: z.string().optional(),
  country: z.string().optional(),
  yearStarted: z.string().optional(),
  instagramHandle: z.string().optional(),
  slug: z.string().min(2),
  headline: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
  whatsappPhone: z.string().optional(),
  themeKey: z.string().default("black_gold"),
  coverPreset: z.string().optional(),
  coverOverlayOpacity: z.number().int().min(0).max(85).default(27),
  coverTextColor: z.enum(["light", "dark"]).default("light"),
  email: z.string().email(),
  password: z.string().min(6),
  services: z.array(serviceSchema).default([]),
  products: z.array(productSchema).max(2).default([])
});

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function fileFromForm(form: FormData, key: string) {
  const value = form.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function cleanHandle(handle?: string | null) {
  return handle?.trim().replace(/^@/, "") || null;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const rawPayload = form.get("payload");
  if (typeof rawPayload !== "string") return jsonError("Missing onboarding payload.");

  const parsed = onboardingSchema.safeParse(JSON.parse(rawPayload));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid onboarding payload.");
  }

  const body = parsed.data;
  const slug = slugify(body.slug);
  if (!slug) return jsonError("Choose a valid profile URL.");

  const [existingAccount, existingUser] = await Promise.all([
    prisma.account.findUnique({ where: { slug } }),
    prisma.user.findUnique({ where: { email: body.email.toLowerCase() } })
  ]);
  if (existingAccount) return jsonError("That profile URL is already taken.");
  if (existingUser) return jsonError("An account with that email already exists.");

  const accountId = crypto.randomUUID();
  const uploadPrefix = `accounts/${accountId}`;
  const profileImage = fileFromForm(form, "profileImage");
  const coverImage = fileFromForm(form, "coverImage");

  const [profileImageUrl, coverImageUrl] = await Promise.all([
    profileImage ? savePublicUpload(profileImage, `${uploadPrefix}/profile`, "profile") : Promise.resolve(null),
    coverImage ? savePublicUpload(coverImage, `${uploadPrefix}/profile`, "cover") : Promise.resolve(null)
  ]);

  const productImageUrls = new Map<string, string>();
  for (const product of body.products) {
    const file = fileFromForm(form, `productImage:${product.clientId}`);
    if (!file) continue;
    const imageUrl = await savePublicUpload(file, `${uploadPrefix}/products`, product.clientId);
    productImageUrls.set(product.clientId, imageUrl);
  }

  const passwordHash = await hashPassword(body.password);
  const now = new Date();

  const account = await prisma.account.create({
    data: {
      id: accountId,
      name: body.businessName,
      slug,
      logoUrl: profileImageUrl,
      themeKey: body.themeKey,
      StoreProfile: {
        create: {
          displayName: body.businessName,
          headline: body.headline || null,
          bio: body.bio || null,
          profileImageUrl,
          coverImageUrl,
          coverPreset: body.coverPreset || null,
          coverOverlayOpacity: body.coverOverlayOpacity,
          coverTextColor: body.coverTextColor,
          phone: body.phone || null,
          whatsappPhone: body.whatsappPhone || null,
          instagramHandle: cleanHandle(body.instagramHandle),
          city: body.city || null,
          country: body.country || null,
          yearStarted: body.yearStarted || null,
          statusLabel: "Taking Orders",
          verificationLabel: "VVS Verified",
          isPublished: true
        }
      },
      Memberships: {
        create: {
          role: "owner",
          status: "active",
          user: {
            create: {
              storeName: body.businessName,
              email: body.email.toLowerCase(),
              name: body.businessName,
              phone: body.phone || body.whatsappPhone || null,
              passwordHash,
              role: "store_owner"
            }
          }
        }
      },
      StoreServices: {
        create: body.services.map(service => ({
          title: service.title,
          description: service.description || null,
          kind: service.kind,
          ctaLabel: service.ctaLabel,
          href: service.href || null,
          sortOrder: service.sortOrder,
          isActive: service.isActive
        }))
      },
      ProductCollections: {
        create: ["chain", "pendant", "ring", "bracelet", "watch", "grillz", "earrings", "trophy", "other"].map((category, index) => ({
          title: category.replace(/\b\w/g, char => char.toUpperCase()),
          slug: category,
          sortOrder: index,
          isActive: true
        }))
      }
    }
  });

  for (const [index, product] of body.products.entries()) {
    const imageUrl = productImageUrls.get(product.clientId);
    if (!imageUrl) continue;

    const collection = await prisma.productCollection.findUnique({
      where: {
        accountId_slug: {
          accountId: account.id,
          slug: product.category
        }
      }
    });
    if (!collection) continue;

    await prisma.product.create({
      data: {
        accountId: account.id,
        collectionId: collection.id,
        name: product.name,
        slug: `${slugify(product.name) || "piece"}-${index + 1}`,
        imageUrl,
        priceLabel: product.priceMode === "set" ? product.priceLabel || null : "Ask for price",
        variantLabelsJson: JSON.stringify(product.variantLabels),
        isFeatured: index === 0,
        sortOrder: index,
        createdAt: now
      }
    });
  }

  return NextResponse.json({
    accountId: account.id,
    slug: account.slug,
    profileUrl: `/s/${account.slug}`,
    ownerUrl: "/owner"
  });
}
