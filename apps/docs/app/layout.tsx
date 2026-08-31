import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Flash Kit Docs',
    template: '%s · Flash Kit',
  },
  description: 'Implementation documentation for the Flash Kit B2C SaaS starter.',
};

type RootLayoutProps = {
  readonly children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps): ReactNode {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider
          search={{
            links: [
              ['Getting Started', '/docs/getting-started'],
              ['Architecture', '/docs/architecture'],
            ],
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
