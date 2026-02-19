/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: { typedRoutes: false },
  basePath,
  assetPrefix: basePath || undefined
};

export default nextConfig;
