import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import { savePublicUpload, useDirectPublicUpload } from "@/src/lib/storage/public-media";
import { parseDirectUploadReference } from "@/src/lib/storage/direct-upload";

const MODES = new Set(["logo", "name", "none"]);

function fileFromForm(form: FormData, key: string) {
  const value = form.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export async function PATCH(req: Request) {
  const owner = await getOwnerContext();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const accountId = owner.accountId;
    const account = await prisma.account.findUnique({ where: { id: accountId }, include: { StoreProfile: true } });
    if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    const form = await req.formData();
    const modeValue = form.get("mode");
    const mode = typeof modeValue === "string" && MODES.has(modeValue) ? modeValue : "logo";

    const logoFile = fileFromForm(form, "logo");
    const directLogo = parseDirectUploadReference(form.get("logoUpload"), "owner-profile");
    const newLogoUrl = directLogo
      ? useDirectPublicUpload(directLogo)
      : logoFile
        ? await savePublicUpload(logoFile, `accounts/${accountId}/profile`, `logo-${Date.now()}`)
        : undefined;

    const existingLogoUrl = account.StoreProfile?.profileImageUrl || account.logoUrl;
    if (mode === "logo" && !newLogoUrl && !existingLogoUrl) {
      return NextResponse.json({ error: "Upload a logo before selecting this option." }, { status: 400 });
    }

    await prisma.account.update({
      where: { id: accountId },
      data: { brandDisplayMode: mode, ...(newLogoUrl ? { logoUrl: newLogoUrl } : {}) }
    });

    if (newLogoUrl) {
      await prisma.storeProfile.upsert({
        where: { accountId },
        update: { profileImageUrl: newLogoUrl },
        create: {
          accountId,
          displayName: account.name,
          profileImageUrl: newLogoUrl,
          statusLabel: "Taking Orders",
          verificationLabel: "VVS Verified",
          isPublished: false
        }
      });
    }

    return NextResponse.json({ mode, logoUrl: newLogoUrl ?? existingLogoUrl ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to update design wizard branding.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
