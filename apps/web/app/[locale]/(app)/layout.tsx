import { requireUser, UnauthenticatedError } from '@repo/auth/server';
import { isLocale } from '@repo/i18n/config';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { normalizeSafeRequestId, REQUEST_ID_HEADER } from '@/lib/security/request-id';

import { AppNavigation } from './_components/app-navigation';

type AppLayoutProps = {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
};

/** Server-side session boundary for every authenticated application route. */
export default async function AppLayout({ children, params }: AppLayoutProps) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  try {
    await requireUser();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect(getLocalizedPathname({ locale: requestedLocale, pathname: '/auth/sign-in' }));
    }

    throw error;
  }

  const requestId = normalizeSafeRequestId((await headers()).get(REQUEST_ID_HEADER));

  return (
    <div
      className="min-h-[calc(100vh-4rem)]"
      {...(requestId ? { 'data-request-id': requestId } : {})}
    >
      <AppNavigation locale={requestedLocale} />
      {children}
    </div>
  );
}
