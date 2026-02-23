/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@reuse360/auth', '@reuse360/db'],
  experimental: {
    typedRoutes: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },
};

export default nextConfig;
