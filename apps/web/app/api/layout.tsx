import type { ReactNode } from 'react';

export type ApiLayoutProps = {
  readonly children: ReactNode;
};

/** Keep missing API paths outside the localized public application shell. */
export default function ApiLayout({ children }: ApiLayoutProps): ReactNode {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
