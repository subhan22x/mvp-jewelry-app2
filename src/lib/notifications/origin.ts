import { isSupabaseAuthConfigured } from "@/src/lib/supabase/env";

// Persist this before background generation starts. Request.userId can be demo
// even for owner work, and is not a reliable notification audience boundary.
export async function requestNotificationAudience(accountId: string): Promise<"owner" | "customer"> {
  if (!isSupabaseAuthConfigured()) return "customer";
  const { getOwnerContext } = await import("@/src/lib/auth/owner-context");
  const owner = await getOwnerContext();
  return owner?.accountIds.includes(accountId) ? "owner" : "customer";
}
