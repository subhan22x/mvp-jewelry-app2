import { redirect } from "next/navigation";
import { getOwnerContext } from "@/src/lib/auth/owner-context";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  if (!await getOwnerContext()) redirect("/login?next=/owner");
  return children;
}
