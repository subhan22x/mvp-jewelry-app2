import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getDefaultAccountId } from "@/src/lib/account";
import { isOwnerRequestAuthenticated } from "@/src/lib/owner-auth";
import { savePublicUpload } from "@/src/lib/storage/public-media";

type ExtraLink = {
  label: string;
  url: string;
};

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(form: FormData, key: string) {
  const value = text(form, key);
  return value || null;
}

function fileFromForm(form: FormData, key: string) {
  const value = form.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function cleanHandle(value: string | null) {
  return value?.replace(/^@/, "").trim() || null;
}

function normalizeUrl(value: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function extraLinks(form: FormData) {
  const links: ExtraLink[] = [];
  for (const index of [1, 2]) {
    const label = text(form, `extraLink${index}Label`);
    const url = normalizeUrl(optionalText(form, `extraLink${index}Url`));
    if (label && url) links.push({ label, url });
  }
  return links;
}

export async function PATCH(req: Request) {
  if (!isOwnerRequestAuthenticated(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const accountId = getDefaultAccountId();
    const account = await prisma.account.findUnique({ where: { id: accountId }, include: { StoreProfile: true } });
    if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    const form = await req.formData();
    const profileImage = fileFromForm(form, "profileImage");
    const profileImageUrl = profileImage
      ? await savePublicUpload(profileImage, `accounts/${accountId}/profile`, `profile-${Date.now()}`)
      : undefined;
    const links = extraLinks(form);

    const data = {
      displayName: account.StoreProfile?.displayName ?? account.name,
      profileImageUrl: profileImageUrl ?? account.StoreProfile?.profileImageUrl ?? null,
      instagramHandle: cleanHandle(optionalText(form, "instagramHandle")),
      phone: optionalText(form, "phone"),
      whatsappPhone: optionalText(form, "phone"),
      websiteUrl: normalizeUrl(optionalText(form, "websiteUrl")),
      city: optionalText(form, "city"),
      country: optionalText(form, "country"),
      extraLinksJson: links.length ? JSON.stringify(links) : null,
      updatedAt: new Date(),
    };

    const profile = await prisma.storeProfile.upsert({
      where: { accountId },
      update: data,
      create: {
        ...data,
        accountId,
        headline: null,
        bio: null,
        statusLabel: "Taking Orders",
        verificationLabel: "VVS Verified",
        isPublished: true,
      },
    });

    if (profileImageUrl) {
      await prisma.account.update({ where: { id: accountId }, data: { logoUrl: profileImageUrl } });
    }

    return NextResponse.json({ profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
