import { requireUser } from '@repo/auth/server';
import { getCreditBalance } from '@repo/billing/server';
import { isLocale, type Locale } from '@repo/i18n/config';
import { Link } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { buttonVariants } from '@repo/ui/button';
import { notFound } from 'next/navigation';

import { CreditConsumptionDemo } from './_components/credit-consumption-demo';

type CreditExamplePageProps = {
  readonly params: Promise<{ locale: string }>;
};

/**
 * Server-first, removable example entry for the protected Credit mutation.
 * The initial balance is read for the authenticated user only.
 */
export default async function CreditExamplePage({ params }: CreditExamplePageProps) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const locale: Locale = requestedLocale;
  const [user, t] = await Promise.all([
    requireUser(),
    getTranslations({ locale, namespace: 'creditDemo' }),
  ]);
  const balance = await getCreditBalance({ userId: user.id });

  return (
    <main className="mx-auto w-full max-w-4xl min-w-0 px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <Link
        className={`${buttonVariants({ variant: 'ghost', size: 'sm' })} -ml-3 max-w-full`}
        href="/settings/billing"
        locale={locale}
      >
        ← {t('backToBilling')}
      </Link>
      <header className="mt-8 max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{t('eyebrow')}</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{t('title')}</h1>
        <p className="mt-6 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          {t('description')}
        </p>
      </header>

      <CreditConsumptionDemo initialBalance={balance.balance} locale={locale} />
    </main>
  );
}
