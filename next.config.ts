import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
};

export default withNextIntl(nextConfig);
