/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@lammart/shared'],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${(process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '').replace(/\/api\/v1$/, '')}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
