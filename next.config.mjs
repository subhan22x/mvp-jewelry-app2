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
    // The vvs-studio job processor reads input images via imageUrlToAttachment,
    // which does a dynamic fs.readFile under public/. That makes the tracer
    // bundle the entire public/ tree (~180MB) into the function, blowing past
    // Vercel's 250MB uncompressed limit. Safe to exclude because that read
    // falls back to fetching the same asset from its URL when it's not on disk.
    // See CLAUDE.md "Deployment gotchas" — the real fix is loading inputs from
    // R2/absolute URLs so this exclude can go away.
    "/api/internal/vvs-studio/jobs/process": [
      "./public/**/*"
    ]
  }
};

export default nextConfig;
