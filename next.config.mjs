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
    ]
  }
};

export default nextConfig;
