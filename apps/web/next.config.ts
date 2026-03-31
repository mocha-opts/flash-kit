import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@flash-kit/ui',
    '@flash-kit/auth',
    '@flash-kit/database',
    '@flash-kit/billing',
    '@flash-kit/email',
    '@flash-kit/i18n',
    '@flash-kit/analytics',
  ],
  experimental: {
    ppr: true,
  },
};

export default nextConfig;
