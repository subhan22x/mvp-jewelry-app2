import { getNamePromptMode } from "@/src/lib/prompt-mode";
import OwnerFrame from "../OwnerFrame";
import OwnerLoginForm from "../OwnerLoginForm";
import PromptModeForm from "../PromptModeForm";
import { isOwnerAuthenticated } from "../_auth";
import ThemeSettingsForm from "./ThemeSettingsForm";

export const dynamic = "force-dynamic";

export default async function OwnerSettingsPage() {
  if (!isOwnerAuthenticated()) return <OwnerLoginForm />;
  const promptMode = await getNamePromptMode();

  return (
    <OwnerFrame active="Settings">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 md:px-6">
        <section>
          <h1 className="text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Settings</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Account preferences, prompt mode, and operational controls.</p>
        </section>
        <ThemeSettingsForm />
        <PromptModeForm initialMode={promptMode} />
      </div>
    </OwnerFrame>
  );
}
