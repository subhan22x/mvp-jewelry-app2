import { cookies } from "next/headers";
import { isOwnerSessionValue, OWNER_SESSION_COOKIE } from "@/src/lib/owner-auth";

export function isOwnerAuthenticated() {
  return isOwnerSessionValue(cookies().get(OWNER_SESSION_COOKIE)?.value);
}
