import { isLocale, type Locale } from '@repo/i18n/config';
import { Link } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { buttonVariants } from '@repo/ui/button';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { AdminUserDate } from '../../_components/admin-user-date';
import { AdminCreditAdjustmentForm } from './_components/admin-credit-adjustment-form';
import { loadAdminCreditPage } from './credits-page.loader';

type AdminCreditPageProps = {
  readonly params: Promise<{ locale: string; userId: string }>;
};

/** Server-first Admin Credit view; the loader independently repeats authorization. */
export default async function AdminCreditPage({ params }: AdminCreditPageProps) {
  const { locale: requestedLocale, userId } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const locale: Locale = requestedLocale;
  const [data, t] = await Promise.all([
    loadAdminCreditPage(userId),
    getTranslations({ locale, namespace: 'admin.users.credits' }),
  ]);

  if (!data) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <header className="flex min-w-0 flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {t('eyebrow')}
          </p>
          <h1 className="mt-5 break-words text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            {t('title')}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {t('description')}
          </p>
        </div>
        <Link
          className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} w-fit`}
          href="/admin/users"
          locale={locale}
        >
          {t('backToUsers')}
        </Link>
      </header>

      <section aria-labelledby="credit-target-title" className="grid gap-6 py-8 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {t('target.label')}
          </p>
          <h2 className="mt-2 break-words text-2xl font-semibold" id="credit-target-title">
            {data.user.name}
          </h2>
          <p className="mt-1 break-all text-sm text-muted-foreground">{data.user.email}</p>
          <p className="mt-3 break-all font-mono text-xs text-muted-foreground">{data.user.id}</p>
        </div>
        <div className="min-w-0 border-t border-border pt-5 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {t('target.balance')}
          </p>
          <p className="mt-2 break-words text-4xl font-semibold tracking-[-0.04em]">
            {formatInteger(data.balance.balance, locale)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t('target.units')}</p>
        </div>
      </section>

      <AdminCreditAdjustmentForm
        initialBalance={data.balance.balance}
        key={`${data.user.id}:${data.balance.balance}`}
        locale={locale}
        userId={data.user.id}
      />

      <section aria-labelledby="credit-history-title" className="py-10 sm:py-12">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t('history.eyebrow')}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]" id="credit-history-title">
            {t('history.title')}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{t('history.description')}</p>
        </div>

        {data.transactions.items.length === 0 ? (
          <p className="mt-8 border border-dashed border-border px-5 py-10 text-sm text-muted-foreground">
            {t('history.empty')}
          </p>
        ) : (
          <div className="mt-8 grid gap-3">
            {data.transactions.items.map((transaction) => (
              <article className="border border-border p-4 sm:p-5" key={transaction.id}>
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t(`history.types.${transaction.type}`)}
                    </p>
                  </div>
                  <p
                    className={`text-lg font-semibold ${transaction.amount < 0 ? 'text-destructive' : 'text-primary'}`}
                  >
                    {formatSignedInteger(transaction.amount, locale)}
                  </p>
                </div>
                <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <Detail
                    label={t('history.balanceAfter')}
                    value={formatInteger(transaction.balanceAfter, locale)}
                  />
                  <Detail
                    label={t('history.actor')}
                    value={transaction.actorUserId ?? t('history.system')}
                  />
                  <Detail
                    label={t('history.reference')}
                    value={`${transaction.referenceType}:${transaction.referenceId}`}
                  />
                  <Detail
                    label={t('history.date')}
                    value={<AdminUserDate locale={locale} value={transaction.createdAt} />}
                  />
                </dl>
              </article>
            ))}
          </div>
        )}

        {data.transactions.hasNext ? (
          <p className="mt-5 text-xs text-muted-foreground">{t('history.recentOnly')}</p>
        ) : null}
      </section>
    </main>
  );
}

type DetailProps = {
  readonly label: string;
  readonly value: ReactNode;
};

function Detail({ label, value }: DetailProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all text-foreground">{value}</dd>
    </div>
  );
}

function formatInteger(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

function formatSignedInteger(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    signDisplay: 'always',
  }).format(value);
}
