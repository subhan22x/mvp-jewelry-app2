import { prisma } from "@/server/db/client";
import { getNamePromptMode } from "@/src/lib/prompt-mode";
import OwnerFrame from "../OwnerFrame";
import PromptModeForm from "../PromptModeForm";
import DesignWizardBrandingCard from "./DesignWizardBrandingCard";
import StorefrontShareCard from "./StorefrontShareCard";
import ThemeSettingsForm from "./ThemeSettingsForm";
import VvsPipelineSettingsForm from "./VvsPipelineSettingsForm";
import SmsNotificationSettingsForm from "./SmsNotificationSettingsForm";
import { requireOwnerContext } from "@/src/lib/auth/owner-context";
import { canManageVvsPipelineSettings } from "@/src/lib/vvs-studio/pipeline-settings";

export const dynamic = "force-dynamic";

export default async function OwnerSettingsPage() {
  const owner = await requireOwnerContext();
  const [promptMode, account] = await Promise.all([
    getNamePromptMode(owner.accountId),
    prisma.account.findUnique({
      where: { id: owner.accountId },
      select: {
        slug: true,
        name: true,
        logoUrl: true,
        brandDisplayMode: true,
        StoreProfile: {
          select: {
            isPublished: true,
            displayName: true,
            profileImageUrl: true,
            smsNotificationPhone: true,
            smsNotificationsEnabled: true,
            smsConsentAt: true
          }
        }
      }
    })
  ]);

  return (
    <OwnerFrame active="Settings">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 md:px-6">
        <section>
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Settings</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Account preferences, prompt mode, and operational controls.</p>
        </section>
        {account && (
          <StorefrontShareCard
            accountSlug={account.slug}
            isPublished={account.StoreProfile?.isPublished ?? false}
          />
        )}
        {account && (
          <DesignWizardBrandingCard
            displayName={account.StoreProfile?.displayName || account.name}
            logoUrl={account.StoreProfile?.profileImageUrl || account.logoUrl}
            initialMode={account.brandDisplayMode === "name" || account.brandDisplayMode === "none" ? account.brandDisplayMode : "logo"}
          />
        )}
        <ThemeSettingsForm />
        {account && (
          <SmsNotificationSettingsForm
            initialPhone={account.StoreProfile?.smsNotificationPhone ?? ""}
            initialEnabled={account.StoreProfile?.smsNotificationsEnabled ?? false}
            initialConsentAt={account.StoreProfile?.smsConsentAt?.toISOString() ?? null}
          />
        )}
        <VvsPipelineSettingsForm enabled={canManageVvsPipelineSettings(owner.email)} />
        <PromptModeForm initialMode={promptMode} />
      </div>
    </OwnerFrame>
  );
}
