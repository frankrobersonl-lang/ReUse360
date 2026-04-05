process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@reuse360/auth', '@reuse360/db'],
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },
};

export default nextConfig;
