import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig = {
  experimental: {
    typedEnv: true,
    useTypeScriptCli: true,
  },
  productionBrowserSourceMaps: false,
  transpilePackages: ['@repo/billing', '@repo/config', '@repo/i18n', '@repo/ui'],
} satisfies NextConfig;

export default withNextIntl(nextConfig);
