import type { Config } from 'tailwindcss';
import { flashKitPreset } from '@flash-kit/tailwind-config/preset';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/billing/src/**/*.{ts,tsx}',
  ],
  presets: [flashKitPreset],
};

export default config;
