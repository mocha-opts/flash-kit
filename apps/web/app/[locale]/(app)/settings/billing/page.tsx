import { requireUser } from '@repo/auth/server';
import type {
  CreditBalance,
  CreditTransactionsPage,
  CreditTransactionView,
} from '@repo/billing/types';
import { BillingUnavailableError } from '@repo/billing/types';
import { isLocale, type Locale } from '@repo/i18n/config';
import { Link } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { buttonVariants } from '@repo/ui/button';
import { notFound } from 'next/navigation';

import { BillingActions, type BillingActionsLabels } from './_components/billing-actions';
import {
  type BillingPageData,
  loadBillingPage,
  parseBillingSearchParams,
} from './billing-page.loader';

type BillingPageProps = {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Server-first billing ledger; only normalized action state crosses to the client leaf. */
export default async function BillingPage({ params, searchParams }: BillingPageProps) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const locale: Locale = requestedLocale;
  const [user, t] = await Promise.all([
    requireUser(),
    getTranslations({ locale, namespace: 'billing' }),
  ]);
  const filters = parseBillingSearchParams(await searchParams);

  let data: BillingPageData;

  try {
    data = await loadBillingPage(user.id, filters);
  } catch (error) {
    if (error instanceof BillingUnavailableError) {
      return <BillingUnavailable t={t} />;
    }

    throw error;
  }

  const subscription = data.subscription;
  const subscriptionStatus = subscription?.status ?? null;

  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <header className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{t('eyebrow')}</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{t('title')}</h1>
        <p className="mt-6 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          {t('description')}
        </p>
      </header>

      <section
        aria-labelledby="billing-ledger-title"
        className="relative mt-10 border-y border-border sm:mt-14"
      >
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-px bg-primary" />
        <h2 className="sr-only" id="billing-ledger-title">
          {t('ledgerLabel')}
        </h2>
        <dl className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <LedgerEntry
            label={t('ledger.activePlan')}
            value={getPlanLabel(data.activePlan.planId, t)}
          />
          <LedgerEntry
            label={t('ledger.subscriptionStatus')}
            value={subscription ? t(`status.${subscription.status}`) : t('status.none')}
          />
          <LedgerEntry
            label={t('ledger.billingPeriod')}
            value={subscription ? formatBillingPeriod(subscription, locale, t) : t('period.none')}
          />
          <LedgerEntry
            label={t('ledger.capability')}
            value={getCapabilitySummary(data.capabilities, t)}
          />
        </dl>
      </section>

      <section
        aria-labelledby="lifetime-title"
        className="mt-12 border-y border-border py-8 sm:mt-16 sm:py-10"
      >
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t('lifetime.eyebrow')}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]" id="lifetime-title">
            {t('lifetime.title')}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {t('lifetime.description')}
          </p>
        </div>
        <dl className="mt-8 border-t border-border pt-6">
          <DetailEntry
            label={t('lifetime.status')}
            value={
              data.activePlan.source === 'lifetime' ? t('lifetime.active') : t('lifetime.inactive')
            }
          />
        </dl>
      </section>

      <section
        aria-labelledby="subscription-title"
        className="mt-12 border-y border-border py-8 sm:mt-16 sm:py-10"
      >
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t('subscription.eyebrow')}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]" id="subscription-title">
            {t('subscription.title')}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {t('subscription.description')}
          </p>
        </div>
        <dl className="mt-8 grid gap-6 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <DetailEntry
            label={t('subscription.status')}
            value={subscription ? t(`status.${subscription.status}`) : t('status.none')}
          />
          <DetailEntry
            label={t('subscription.interval')}
            value={
              subscription?.interval ? t(`interval.${subscription.interval}`) : t('period.none')
            }
          />
          <DetailEntry
            label={t('subscription.period')}
            value={subscription ? formatBillingPeriod(subscription, locale, t) : t('period.none')}
          />
          <DetailEntry
            label={t('subscription.cancelAtPeriodEnd')}
            value={subscription?.cancelAtPeriodEnd ? t('yes') : t('no')}
          />
        </dl>
      </section>

      <section
        aria-labelledby="capabilities-title"
        className="mt-12 border-y border-border py-8 sm:mt-16 sm:py-10"
      >
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t('capabilities.eyebrow')}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]" id="capabilities-title">
            {t('capabilities.title')}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {t('capabilities.description')}
          </p>
        </div>
        <ul className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-6">
          <CapabilityEntry
            label={t('capabilities.checkout')}
            enabled={data.capabilities.checkout}
            t={t}
          />
          <CapabilityEntry
            label={t('capabilities.lifetimeCheckout')}
            enabled={data.capabilities.lifetimeCheckout}
            t={t}
          />
          <CapabilityEntry
            label={t('capabilities.customerPortal')}
            enabled={data.capabilities.customerPortal}
            t={t}
          />
          <CapabilityEntry
            label={t('capabilities.cancelSubscription')}
            enabled={data.capabilities.cancelSubscription}
            t={t}
          />
          <CapabilityEntry
            label={t('capabilities.restoreSubscription')}
            enabled={data.capabilities.restoreSubscription}
            t={t}
          />
          <CapabilityEntry
            label={t('capabilities.creditCheckout')}
            enabled={data.capabilities.creditCheckout}
            t={t}
          />
        </ul>
      </section>

      <BillingActions
        cancelAtPeriodEnd={subscription?.cancelAtPeriodEnd ?? false}
        capabilities={data.capabilities}
        labels={getActionLabels(t)}
        lifetimeActive={data.activePlan.source === 'lifetime'}
        subscriptionId={subscription?.id ?? null}
        subscriptionStatus={subscriptionStatus}
      />

      <CreditSection
        balance={data.creditBalance}
        locale={locale}
        page={data.creditTransactions}
        t={t}
      />
    </main>
  );
}

type BillingTranslations = Awaited<ReturnType<typeof import('@repo/i18n/server').getTranslations>>;

type CreditSectionProps = {
  readonly balance: CreditBalance;
  readonly locale: Locale;
  readonly page: CreditTransactionsPage;
  readonly t: BillingTranslations;
};

function CreditSection({ balance, locale, page, t }: CreditSectionProps) {
  return (
    <section
      aria-labelledby="credits-title"
      className="mt-12 border-y border-border py-8 sm:mt-16 sm:py-10"
    >
      <div className="max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {t('credits.eyebrow')}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em]" id="credits-title">
          {t('credits.title')}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{t('credits.description')}</p>
      </div>

      <div className="mt-8 grid gap-4 border-t border-border pt-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-8">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {t('credits.balanceLabel')}
          </p>
          <p className="mt-3 break-words text-3xl font-semibold tracking-[-0.04em]">
            {formatInteger(balance.balance, locale)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t('credits.units')}</p>
          {balance.balance < 0 ? (
            <div
              aria-live="polite"
              className="mt-5 border-l-2 border-destructive pl-4"
              role="status"
            >
              <p className="text-sm font-medium text-destructive">
                {t('credits.negativeBalance.title')}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {t('credits.negativeBalance.description')}
              </p>
            </div>
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
            {t('credits.purchaseTitle')}
          </p>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {t('credits.purchaseDescription')}
          </p>
        </div>
      </div>

      <section
        aria-labelledby="credit-history-title"
        className="mt-10 min-w-0 border-t border-border pt-8"
      >
        <div className="max-w-2xl">
          <h3 className="text-xl font-semibold tracking-[-0.03em]" id="credit-history-title">
            {t('credits.history.title')}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {t('credits.history.description')}
          </p>
        </div>

        {page.items.length === 0 ? (
          <div className="mt-6 border border-dashed border-border px-5 py-8 text-center sm:px-8">
            <h4 className="text-base font-medium">{t('credits.history.emptyTitle')}</h4>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {t('credits.history.emptyDescription')}
            </p>
          </div>
        ) : (
          <CreditHistory items={page.items} locale={locale} t={t} />
        )}

        <CreditPagination locale={locale} page={page} t={t} />
      </section>
    </section>
  );
}

type CreditHistoryProps = {
  readonly items: readonly CreditTransactionView[];
  readonly locale: Locale;
  readonly t: BillingTranslations;
};

function CreditHistory({ items, locale, t }: CreditHistoryProps) {
  return (
    <div className="mt-6 overflow-x-auto border border-border">
      <table className="w-full min-w-[60rem] border-collapse text-left text-sm">
        <caption className="sr-only">{t('credits.history.title')}</caption>
        <thead className="bg-muted/40 text-xs uppercase tracking-[0.1em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium" scope="col">
              {t('credits.history.reason')}
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              {t('credits.history.type')}
            </th>
            <th className="px-4 py-3 text-right font-medium" scope="col">
              {t('credits.history.amount')}
            </th>
            <th className="px-4 py-3 text-right font-medium" scope="col">
              {t('credits.history.balanceAfter')}
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              {t('credits.history.date')}
            </th>
            <th className="px-4 py-3 font-medium" scope="col">
              {t('credits.history.relatedPurchase')}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((transaction) => (
            <tr className="border-t border-border align-top" key={transaction.id}>
              <td className="max-w-[18rem] px-4 py-4">
                <p className="font-medium">{getCreditReason(transaction, t)}</p>
                {transaction.type !== 'purchase' && transaction.description ? (
                  <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                    {transaction.description}
                  </p>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                {getCreditTypeLabel(transaction.type, t)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-right font-mono tabular-nums">
                {formatInteger(transaction.amount, locale, 'always')}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-right font-mono tabular-nums">
                {formatInteger(transaction.balanceAfter, locale)}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                <time dateTime={transaction.createdAt}>
                  {formatDate(transaction.createdAt, locale) ?? t('credits.history.unknownDate')}
                </time>
              </td>
              <td className="max-w-[16rem] px-4 py-4">
                <RelatedPurchase locale={locale} t={t} transaction={transaction} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RelatedPurchase({
  locale,
  t,
  transaction,
}: {
  readonly locale: Locale;
  readonly t: BillingTranslations;
  readonly transaction: CreditTransactionView;
}) {
  if (transaction.purchase === null) {
    return transaction.type === 'purchase' ? (
      <span className="text-muted-foreground">{t('credits.history.unknownPurchase')}</span>
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  }

  const purchase = transaction.purchase;

  return (
    <div className="min-w-0">
      <p className="break-words font-medium">{getPlanLabel(purchase.planId, t)}</p>
      <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
        {formatMinorCurrency(purchase.amount, purchase.currency, locale)}
      </p>
      <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
        <span className="font-medium text-foreground">{t('credits.history.provider')}:</span>{' '}
        {purchase.provider.toUpperCase()}
      </p>
      <time
        className="mt-1 block text-xs leading-5 text-muted-foreground"
        dateTime={purchase.purchasedAt}
      >
        {formatDate(purchase.purchasedAt, locale) ?? t('credits.history.unknownDate')}
      </time>
      <p className="mt-1 break-all font-mono text-[0.68rem] leading-5 text-muted-foreground">
        <span className="font-sans font-medium text-foreground">
          {t('credits.history.reference')}:
        </span>{' '}
        <span title={purchase.id}>{purchase.id}</span>
      </p>
    </div>
  );
}

function CreditPagination({
  locale,
  page,
  t,
}: {
  readonly locale: Locale;
  readonly page: CreditTransactionsPage;
  readonly t: BillingTranslations;
}) {
  if (page.page <= 1 && !page.hasNext) {
    return null;
  }

  const query = (targetPage: number) => `/settings/billing?creditPage=${targetPage}`;

  return (
    <nav
      aria-label={t('credits.pagination.label')}
      className="mt-8 flex flex-wrap items-center gap-3"
    >
      {page.page > 1 ? (
        <Link
          aria-label={t('credits.pagination.previous')}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          href={query(page.page - 1)}
          locale={locale}
        >
          {t('credits.pagination.previous')}
        </Link>
      ) : null}
      <span className="text-sm text-muted-foreground">
        {t('credits.pagination.page', { page: page.page })}
      </span>
      {page.hasNext ? (
        <Link
          aria-label={t('credits.pagination.next')}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          href={query(page.page + 1)}
          locale={locale}
        >
          {t('credits.pagination.next')}
        </Link>
      ) : null}
    </nav>
  );
}

function formatInteger(
  value: number,
  locale: Locale,
  signDisplay?: Intl.NumberFormatOptions['signDisplay'],
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    signDisplay,
    useGrouping: true,
  }).format(value);
}

function formatMinorCurrency(amount: number, currency: string, locale: Locale): string {
  const normalizedCurrency = currency.trim().toUpperCase();

  if (normalizedCurrency === '') {
    return formatInteger(amount, locale);
  }

  try {
    const currencyOptions = {
      currency: normalizedCurrency,
      currencyDisplay: 'code' as const,
      style: 'currency' as const,
    };
    const fractionDigits =
      new Intl.NumberFormat(locale, currencyOptions).resolvedOptions().maximumFractionDigits ?? 2;

    return new Intl.NumberFormat(locale, {
      ...currencyOptions,
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits,
    }).format(amount / 10 ** fractionDigits);
  } catch {
    return `${formatInteger(amount, locale)} ${normalizedCurrency}`;
  }
}

function getCreditTypeLabel(type: CreditTransactionView['type'], t: BillingTranslations): string {
  switch (type) {
    case 'purchase':
      return t('credits.types.purchase');
    case 'consumption':
      return t('credits.types.consumption');
    case 'refund':
      return t('credits.types.refund');
    case 'adjustment':
      return t('credits.types.adjustment');
    default:
      return t('credits.types.unknown');
  }
}

function getCreditReason(transaction: CreditTransactionView, t: BillingTranslations): string {
  switch (transaction.type) {
    case 'purchase':
      return t('credits.reasons.purchase');
    case 'consumption':
      return t('credits.reasons.consumption');
    case 'refund':
      return t('credits.reasons.refund');
    case 'adjustment':
      return t('credits.reasons.adjustment');
    default:
      return t('credits.reasons.unknown');
  }
}

function BillingUnavailable({ t }: { readonly t: BillingTranslations }) {
  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-4xl flex-col justify-center px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
        {t('unavailable.eyebrow')}
      </p>
      <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">
        {t('unavailable.title')}
      </h1>
      <p
        aria-live="assertive"
        className="mt-6 max-w-lg text-base leading-7 text-destructive"
        role="alert"
      >
        {t('unavailable.description')}
      </p>
    </main>
  );
}

function LedgerEntry({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0 px-5 py-6 sm:px-6 lg:px-7">
      <dt className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-3 break-words text-lg font-medium tracking-[-0.02em]">{value}</dd>
    </div>
  );
}

function DetailEntry({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-2 break-words text-sm font-medium">{value}</dd>
    </div>
  );
}

function CapabilityEntry({
  enabled,
  label,
  t,
}: {
  readonly enabled: boolean;
  readonly label: string;
  readonly t: BillingTranslations;
}) {
  return (
    <li className="flex min-w-0 items-center justify-between gap-4 border-t border-border pt-3 text-sm">
      <span className="min-w-0 break-words">{label}</span>
      <span className={enabled ? 'shrink-0 text-primary' : 'shrink-0 text-muted-foreground'}>
        {enabled ? t('capabilities.available') : t('capabilities.unavailable')}
      </span>
    </li>
  );
}

function getPlanLabel(planId: string, t: BillingTranslations): string {
  switch (planId) {
    case 'free':
      return t('plans.free');
    case 'pro-monthly':
      return t('plans.proMonthly');
    case 'pro-yearly':
      return t('plans.proYearly');
    case 'lifetime':
      return t('plans.lifetime');
    case 'credit-pack-100':
      return t('plans.creditPack');
    default:
      return t('plans.unknown');
  }
}

function formatBillingPeriod(
  subscription: NonNullable<BillingPageData['subscription']>,
  locale: Locale,
  t: BillingTranslations,
): string {
  const interval = subscription.interval
    ? t(`interval.${subscription.interval}`)
    : t('period.unknown');
  const start = formatDate(subscription.periodStart, locale);
  const end = formatDate(subscription.periodEnd, locale);

  if (start && end) {
    return `${interval} · ${start} – ${end}`;
  }

  return interval;
}

function formatDate(value: string | undefined, locale: Locale): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

function getCapabilitySummary(
  capabilities: BillingPageData['capabilities'],
  t: BillingTranslations,
): string {
  const count = Object.values(capabilities).filter(Boolean).length;

  return t('capabilities.summary', { count, total: Object.keys(capabilities).length });
}

function getActionLabels(t: BillingTranslations): BillingActionsLabels {
  return {
    actionFailed: t('actions.actionFailed'),
    cancel: t('actions.cancel'),
    cancelPending: t('actions.cancelPending'),
    checkoutDescription: t('actions.checkoutDescription'),
    checkoutLifetime: t('actions.checkoutLifetime'),
    checkoutLifetimePending: t('actions.checkoutLifetimePending'),
    checkoutCreditPack: t('credits.purchase'),
    checkoutCreditPackPending: t('credits.purchasePending'),
    checkoutMonthly: t('actions.checkoutMonthly'),
    checkoutMonthlyPending: t('actions.checkoutMonthlyPending'),
    checkoutTitle: t('actions.checkoutTitle'),
    checkoutYearly: t('actions.checkoutYearly'),
    checkoutYearlyPending: t('actions.checkoutYearlyPending'),
    lifetimeDescription: t('actions.lifetimeDescription'),
    lifetimeTitle: t('actions.lifetimeTitle'),
    creditPackDescription: t('credits.purchaseDescription'),
    creditPackTitle: t('credits.purchaseTitle'),
    manageDescription: t('actions.manageDescription'),
    manageTitle: t('actions.manageTitle'),
    portal: t('actions.portal'),
    portalPending: t('actions.portalPending'),
    restore: t('actions.restore'),
    restorePending: t('actions.restorePending'),
    updated: t('actions.updated'),
  };
}
