import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloudflare Pages uses Node.js runtime
  // No static export needed - Cloudflare supports full Next.js features

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.eu-central-1.wasabisys.com',
        pathname: '/zefile-**/**',
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:shortCode([a-zA-Z0-9]{8})',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, private',
          },
        ],
      },
      {
        source: '/download/:shortCode',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive, nosnippet',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, private',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
