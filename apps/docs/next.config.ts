import type { NextConfig } from 'next';

const nextConfig = {
  experimental: {
    typedEnv: true,
    useTypeScriptCli: true,
  },
  productionBrowserSourceMaps: false,
} satisfies NextConfig;

export default nextConfig;
