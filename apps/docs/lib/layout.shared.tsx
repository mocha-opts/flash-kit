import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Flash Kit',
      url: '/docs',
    },
    githubUrl: 'https://github.com/mocha-opts/flash-kit',
  };
}
