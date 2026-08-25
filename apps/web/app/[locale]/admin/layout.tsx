import { ForbiddenError, requireAdmin, UnauthenticatedError } from '@repo/auth/server';
import { isLocale, type Locale } from '@repo/i18n/config';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AdminNavigation } from './_components/admin-navigation';

type AdminLayoutProps = {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
};

/** Server-side Admin boundary; Proxy and navigation never authorize this route. */
export default async function AdminLayout({ children, params }: AdminLayoutProps) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const locale: Locale = requestedLocale;

  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect(
        getLocalizedPathname({
          locale,
          pathname: '/auth/sign-in?next=%2Fadmin%2Fusers',
        }),
      );
    }

    if (error instanceof ForbiddenError) {
      notFound();
    }

    throw error;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <AdminNavigation locale={locale} />
      {children}
    </div>
  );
}
