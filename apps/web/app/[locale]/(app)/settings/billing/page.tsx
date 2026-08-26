import { requireUser } from '@repo/auth/server';
import { BillingUnavailableError } from '@repo/billing/types';
import { isLocale, type Locale } from '@repo/i18n/config';
import { getTranslations } from '@repo/i18n/server';
import { notFound } from 'next/navigation';

import { BillingActions, type BillingActionsLabels } from './_components/billing-actions';
import { type BillingPageData, loadBillingPage } from './billing-page.loader';

type BillingPageProps = {
  readonly params: Promise<{ locale: string }>;
};

/** Server-first billing ledger; only normalized action state crosses to the client leaf. */
export default async function BillingPage({ params }: BillingPageProps) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const locale: Locale = requestedLocale;
  const [user, t] = await Promise.all([
    requireUser(),
    getTranslations({ locale, namespace: 'billing' }),
  ]);

  let data: BillingPageData;

  try {
    data = await loadBillingPage(user.id);
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
        <ul className="mt-8 grid gap-3 border-t border-border pt-6 sm:grid-cols-2 lg:grid-cols-5">
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
    </main>
  );
}

type BillingTranslations = Awaited<ReturnType<typeof import('@repo/i18n/server').getTranslations>>;

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
    checkoutMonthly: t('actions.checkoutMonthly'),
    checkoutMonthlyPending: t('actions.checkoutMonthlyPending'),
    checkoutTitle: t('actions.checkoutTitle'),
    checkoutYearly: t('actions.checkoutYearly'),
    checkoutYearlyPending: t('actions.checkoutYearlyPending'),
    lifetimeDescription: t('actions.lifetimeDescription'),
    lifetimeTitle: t('actions.lifetimeTitle'),
    manageDescription: t('actions.manageDescription'),
    manageTitle: t('actions.manageTitle'),
    portal: t('actions.portal'),
    portalPending: t('actions.portalPending'),
    restore: t('actions.restore'),
    restorePending: t('actions.restorePending'),
    updated: t('actions.updated'),
  };
}
