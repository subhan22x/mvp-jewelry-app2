import { cookies } from "next/headers";
import { isOwnerSessionValue, OWNER_SESSION_COOKIE } from "@/src/lib/owner-auth";
import { getNamePromptMode } from "@/src/lib/prompt-mode";
import OwnerLoginForm from "../OwnerLoginForm";
import PromptModeForm from "../PromptModeForm";
import OwnerFrame from "../OwnerFrame";

export const dynamic = "force-dynamic";

export default async function OwnerAccountPage() {
  const cookieValue = cookies().get(OWNER_SESSION_COOKIE)?.value;
  if (!isOwnerSessionValue(cookieValue)) {
    return <OwnerLoginForm />;
  }

  const promptMode = await getNamePromptMode();

  return (
    <OwnerFrame active="Settings">
      <div className="mx-auto flex w-full min-w-0 max-w-5xl flex-col gap-8 px-4 md:px-6">
        <section className="min-w-0">
          <h1 className="mt-3 text-[32px] font-bold tracking-tight text-[#e1e2ec] md:text-4xl">Account</h1>
          <p className="mt-2 text-[15px] text-[#c2c6d6]">Manage owner-level settings for the admin panel.</p>
        </section>

        <PromptModeForm initialMode={promptMode} />
      </div>
    </OwnerFrame>
  );
}
