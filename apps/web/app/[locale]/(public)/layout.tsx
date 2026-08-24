import type { ReactNode } from 'react';

import { defaultLocale, isLocale, type Locale } from '@repo/i18n/config';
import { PublicFooter } from '@/components/public-shell/footer';
import { PublicHeader } from '@/components/public-shell/header';

export type PublicLayoutProps = {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
};

/** Public-only shell; future locale routes can remain outside this group. */
export default async function PublicLayout({ children, params }: PublicLayoutProps) {
  const { locale: requestedLocale } = await params;
  const locale: Locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;

  return (
    <>
      <PublicHeader locale={locale} />
      {children}
      <PublicFooter locale={locale} />
    </>
  );
}
