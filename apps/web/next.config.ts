import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig = {
  experimental: {
    globalNotFound: true,
    typedEnv: true,
    useTypeScriptCli: true,
  },
  productionBrowserSourceMaps: false,
  transpilePackages: ['@repo/config', '@repo/i18n', '@repo/ui'],
} satisfies NextConfig;

export default withNextIntl(nextConfig);
