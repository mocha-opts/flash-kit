import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import { getSecurityHeaders } from '@/lib/security/request-security';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig = {
  experimental: {
    typedEnv: true,
    useTypeScriptCli: true,
  },
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  transpilePackages: ['@repo/billing', '@repo/config', '@repo/i18n', '@repo/ui'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [...getSecurityHeaders(process.env.NODE_ENV === 'production')],
      },
    ];
  },
} satisfies NextConfig;

export default withNextIntl(nextConfig);
