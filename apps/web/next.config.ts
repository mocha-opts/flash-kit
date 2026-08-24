import type { NextConfig } from 'next';

const nextConfig = {
  experimental: {
    typedEnv: true,
    useTypeScriptCli: true,
  },
  productionBrowserSourceMaps: false,
  transpilePackages: ['@repo/config', '@repo/ui'],
} satisfies NextConfig;

export default nextConfig;
