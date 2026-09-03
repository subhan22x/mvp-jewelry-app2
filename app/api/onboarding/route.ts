import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/client";
import { parseDirectUploadReference } from "@/src/lib/storage/direct-upload";
import { savePublicUpload, useDirectPublicUpload } from "@/src/lib/storage/public-media";
import { slugify } from "@/src/lib/slug";
import { createClient } from "@/src/lib/supabase/server";

export const dynamic = "force-dynamic";

const onboardingSchema = z.object({
  businessName: z.string().trim().min(2),
  ownerName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  instagramHandle: z.string().trim().optional()
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

async function uniqueSlug(base: string, tx: Prisma.TransactionClient): Promise<string> {
  const normalized = slugify(base) || "store";
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? normalized : `${normalized}-${i + 1}`;
    const existing = await tx.account.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
  }
  return `${normalized}-${Date.now()}`;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) return jsonError("Sign up or log in before creating your studio.", 401);

  const form = await req.formData();
  const rawPayload = form.get("payload");
  if (typeof rawPayload !== "string") return jsonError("Missing onboarding payload.");

  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return jsonError("Invalid onboarding payload.");
  }

  const parsed = onboardingSchema.safeParse(payload);
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "Invalid onboarding payload.");

  const body = parsed.data;
  const authEmail = data.user.email?.toLowerCase() ?? null;
  const [existingUser, existingEmailUser] = await Promise.all([
    prisma.user.findUnique({
      where: { authUserId: data.user.id },
      select: {
        id: true,
        Memberships: {
          where: { status: "active", account: { status: "active" } },
          select: { accountId: true },
          orderBy: { createdAt: "asc" },
          take: 1
        }
      }
    }),
    authEmail
      ? prisma.user.findUnique({ where: { email: authEmail }, select: { id: true, authUserId: true } })
      : Promise.resolve(null)
  ]);
  const existingMembership = existingUser?.Memberships[0];
  if (existingMembership) {
    return NextResponse.json({
      accountId: existingMembership.accountId,
      ownerUrl: "/owner",
      alreadyCreated: true
    });
  }
  if (existingUser) return jsonError("This login has a store profile without an active account. Contact support before retrying.", 409);
  if (existingEmailUser && existingEmailUser.authUserId !== data.user.id) {
    return jsonError("An account with this email already exists.");
  }

  const accountId = crypto.randomUUID();
  const uploadPrefix = `accounts/${accountId}`;
  const logoFile = fileFromForm(form, "logo");
  const directLogo = parseDirectUploadReference(form.get("logoUpload"), "onboarding");
  const logoUrl = directLogo
    ? useDirectPublicUpload(directLogo)
    : logoFile
      ? await savePublicUpload(logoFile, `${uploadPrefix}/profile`, "logo")
      : null;

  const account = await prisma.$transaction(async (tx) => {
    const slug = await uniqueSlug(body.businessName, tx);
    return tx.account.create({
      data: {
        id: accountId,
        name: body.businessName,
        slug,
        logoUrl,
        themeKey: "classic_black_gold",
        status: "active",
        subscriptionPlanKey: "basic",
        subscriptionStatus: "incomplete",
        StoreProfile: {
          create: {
            displayName: body.businessName,
            profileImageUrl: logoUrl,
            phone: body.phone || null,
            instagramHandle: cleanHandle(body.instagramHandle),
            isPublished: false
          }
        },
        Memberships: {
          create: {
            role: "owner",
            status: "active",
            user: {
              create: {
                authUserId: data.user.id,
                storeName: body.businessName,
                email: authEmail,
                name: body.ownerName || null,
                phone: body.phone || null,
                role: "store_owner"
              }
            }
          }
        },
        StoreServices: {
          create: [
            {
              kind: "quote",
              title: "Custom Quote Requests",
              description: "Customers can request a quote for a custom piece.",
              ctaLabel: "Get Quote",
              href: "/picture-pendants",
              sortOrder: 0,
              isActive: true
            },
            {
              kind: "design_custom",
              title: "Design Custom",
              description: "Customers can design a custom pendant.",
              ctaLabel: "Design Custom",
              href: "/pendants",
              sortOrder: 1,
              isActive: true
            }
          ]
        }
      }
    });
  });

  return NextResponse.json({
    accountId: account.id,
    slug: account.slug,
    ownerUrl: "/owner"
  });
}
