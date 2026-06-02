import { redirect } from "next/navigation";
import { getOwnerContext } from "@/src/lib/auth/owner-context";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getOwnerContext()) redirect("/owner");
  return <LoginForm />;
}
