import { getUser } from '@repo/auth/server';
import { isLocale } from '@repo/i18n/config';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { notFound, redirect } from 'next/navigation';

type DashboardPageProps = {
  readonly params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const user = await getUser();

  if (!user) {
    redirect(getLocalizedPathname({ locale: requestedLocale, pathname: '/auth/sign-in' }));
  }

  const t = await getTranslations({ locale: requestedLocale, namespace: 'dashboard' });

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{t('eyebrow')}</p>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{t('title')}</h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
        {t('welcome', { name: user.name || user.email })}
      </p>
      <div className="mt-10 border-y border-border py-5 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{t('signedInAs')}:</span> {user.email}
      </div>
    </main>
  );
}
