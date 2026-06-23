export type InstagramProfileStatus = "found" | "not_found" | "invalid" | "unknown";

export function cleanInstagramHandle(value: string | null) {
  return value?.replace(/^@+/, "").trim().toLowerCase() ?? "";
}

export function isValidInstagramHandle(value: string) {
  return /^[a-z0-9._]{1,30}$/.test(value) && !value.includes("..") && !value.startsWith(".") && !value.endsWith(".");
}

export async function checkInstagramProfile(value: string | null) {
  const username = cleanInstagramHandle(value);
  if (!username || !isValidInstagramHandle(username)) {
    return { username, exists: false, status: "invalid" as InstagramProfileStatus };
  }

  try {
    const response = await fetch(`https://www.instagram.com/${encodeURIComponent(username)}/`, {
      cache: "no-store",
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JewelryStudioBot/1.0)",
        Accept: "text/html,application/xhtml+xml"
      }
    });

    if (response.status === 404) {
      return { username, exists: false, status: "not_found" as InstagramProfileStatus };
    }
    if (response.ok) {
      const html = await response.text();
      const hasProfileSignals = html.includes(`instagram.com/${username}`) || html.includes(`@${username}`) || html.includes(`"username":"${username}"`);
      return {
        username,
        exists: hasProfileSignals,
        status: (hasProfileSignals ? "found" : "unknown") as InstagramProfileStatus
      };
    }
  } catch {
    // Instagram may throttle or block automated verification. Surface that as unknown.
  }

  return { username, exists: null, status: "unknown" as InstagramProfileStatus };
}
