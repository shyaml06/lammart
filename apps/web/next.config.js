/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@lammart/shared'],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const apiTarget = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiTarget.replace(/\/api\/v1$/, '')}/api/v1/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiTarget.replace(/\/api\/v1$/, '')}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
