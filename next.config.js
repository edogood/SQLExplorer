/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['tsx', 'ts'],
  experimental: {
    typedRoutes: false
  }
};

module.exports = nextConfig;
