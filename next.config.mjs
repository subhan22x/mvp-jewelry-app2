/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  outputFileTracingExcludes: {
    "/internal/generations": [
      "./public/generated/**/*",
      "./public/pendants/**/*",
      "./public/plain-pendants/**/*",
      "./public/picture-pendants/**/*",
      "./public/emblems/**/*",
      "./public/logo-pendants/**/*",
      "./public/samples/**/*",
      "./public/vvs-studio/**/*"
    ],
    // Generation routes call the Google provider, which reads reference images
    // from public/ via fs.readFile with no URL fallback, so the tracer bundles
    // public/ into each function — pushing several past Vercel's 250MB limit.
    // These three paths are NEVER read from disk at runtime by any API route
    // (public/generated is written output served by URL; _originals are unused
    // source PNGs; vvs-studio assets load by URL), so drop them from every API
    // function. Each route still keeps the category reference dir it needs.
    // See CLAUDE.md "Deployment gotchas".
    "/api": [
      "./public/generated/**/*",
      "./public/necklaces/references/_originals/**/*",
      "./public/vvs-studio/**/*"
    ],
    // The vvs-studio job processor additionally reads inputs via a dynamic
    // fs.readFile under public/, dragging the whole tree in. Safe to exclude
    // entirely because imageUrlToAttachment falls back to fetching by URL.
    "/api/internal/vvs-studio/jobs/process": [
      "./public/**/*"
    ]
  }
};

export default nextConfig;
