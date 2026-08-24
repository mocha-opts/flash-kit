import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import '@repo/ui/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flash Kit',
  description: 'A minimal foundation app for the Flash Kit SaaS starter.',
};

type RootLayoutProps = {
  readonly children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
