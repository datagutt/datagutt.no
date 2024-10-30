/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  experimental: {
    ppr: true,
    dynamicIO: true,
  },
};

export default nextConfig;
