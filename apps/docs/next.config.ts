import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

const nextConfig = {
  experimental: {
    typedEnv: true,
    useTypeScriptCli: true,
  },
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
} satisfies NextConfig;

const withMDX = createMDX();

export default withMDX(nextConfig);
