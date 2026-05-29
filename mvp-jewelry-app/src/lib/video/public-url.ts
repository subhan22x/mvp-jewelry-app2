export function getPublicBaseUrl(req: Request) {
  const baseUrl = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (baseUrl) return baseUrl;

  const origin = req.headers.get("origin");
  if (origin) return origin;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  throw new Error("APP_BASE_URL or NEXT_PUBLIC_APP_URL is required so Wavespeed can fetch the generated image.");
}

export function toPublicImageUrl(req: Request, imageUrl: string) {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return new URL(imageUrl, getPublicBaseUrl(req)).toString();
}

export function assertPublicImageUrl(sourceImageUrl: string) {
  const url = new URL(sourceImageUrl);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    throw new Error("A public APP_BASE_URL or NEXT_PUBLIC_APP_URL is required so Wavespeed can fetch the generated image.");
  }
}
