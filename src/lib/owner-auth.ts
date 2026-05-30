import { createHash } from "node:crypto";

export const OWNER_SESSION_COOKIE = "owner_session";

export function getOwnerAccessCode() {
  return process.env.OWNER_ACCESS_CODE?.trim() ?? "";
}

export function createOwnerSessionValue(accessCode = getOwnerAccessCode()) {
  return createHash("sha256").update(`owner:${accessCode}`).digest("hex");
}

export function isOwnerSessionValue(value: string | undefined | null) {
  const accessCode = getOwnerAccessCode();
  return Boolean(accessCode && value && value === createOwnerSessionValue(accessCode));
}

export function isOwnerRequestAuthenticated(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookies = cookieHeader.split(";").map(cookie => cookie.trim());
  const ownerCookie = cookies.find(cookie => cookie.startsWith(`${OWNER_SESSION_COOKIE}=`));
  if (!ownerCookie) return false;
  const value = decodeURIComponent(ownerCookie.slice(OWNER_SESSION_COOKIE.length + 1));
  return isOwnerSessionValue(value);
}
