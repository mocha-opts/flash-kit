import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { billingCatalog } from '@repo/billing/config';
import {
  PricingTable,
  type PaidCatalogPlan,
  type PricingTableCardProps,
} from '@repo/billing/components';
import type { BillingFeature, CatalogPlan } from '@repo/billing/types';
import { isLocale, type Locale } from '@repo/i18n/config';
import { Link } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { buttonVariants } from '@repo/ui/button';
import { notFound } from 'next/navigation';

type PricingPageProps = {
  readonly params: Promise<{ locale: string }>;
};

const planCopy: Record<string, { description: string; name: string; cta: string }> = {
  free: {
    name: 'plans.free.name',
    description: 'plans.free.description',
    cta: 'plans.free.cta',
  },
  'pro-monthly': {
    name: 'plans.pro-monthly.name',
    description: 'plans.pro-monthly.description',
    cta: 'plans.pro-monthly.cta',
  },
  'pro-yearly': {
    name: 'plans.pro-yearly.name',
    description: 'plans.pro-yearly.description',
    cta: 'plans.pro-yearly.cta',
  },
  lifetime: {
    name: 'plans.lifetime.name',
    description: 'plans.lifetime.description',
    cta: 'plans.lifetime.cta',
  },
  'credit-pack-100': {
    name: 'plans.credit-pack-100.name',
    description: 'plans.credit-pack-100.description',
    cta: 'plans.credit-pack-100.cta',
  },
};

export async function generateMetadata({ params }: PricingPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('pricingTitle'),
    description: t('pricingDescription'),
  };
}

export default async function PricingPage({ params }: PricingPageProps): Promise<ReactNode> {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const locale = requestedLocale;
  const t = await getTranslations({ locale, namespace: 'pricing' });

  return (
    <main>
      <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-12 pt-16 sm:px-8 sm:pb-16 sm:pt-24 lg:grid-cols-[minmax(0,1.25fr)_minmax(15rem,0.75fr)] lg:items-end lg:gap-20 lg:px-10">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {t('eyebrow')}
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            {t('title')}
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {t('description')}
          </p>
        </div>
        <aside
          className="border-l-2 border-primary py-1 pl-5 sm:pl-7"
          aria-label={t('catalogNote')}
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {t('featuresLabel')}
          </p>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{t('catalogNote')}</p>
        </aside>
      </section>

      <div className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8 sm:pb-24 lg:px-10">
        <PricingTable
          ariaLabel={t('tableLabel')}
          className="gap-7"
          planCardProps={(plan) => createPlanCardProps(plan, locale, t)}
          plans={billingCatalog.plans}
        />
      </div>
    </main>
  );
}

function createPlanCardProps(
  plan: CatalogPlan,
  locale: Locale,
  t: Awaited<ReturnType<typeof getTranslations>>,
): PricingTableCardProps {
  const copy = planCopy[plan.id];
  const featureLabels: Record<string, string> = {
    core_workspace: t('features.core_workspace'),
    advanced_generation: t('features.advanced_generation'),
    generation_credits: t('features.generation_credits'),
  };
  const limitLabels: Record<string, string> = {
    projects: t('limits.projects'),
    generations_per_month: t('limits.generations_per_month'),
  };

  return {
    action: createPlanAction(plan, t),
    description: copy === undefined ? undefined : t(copy.description),
    featureLabel: (feature: BillingFeature) => {
      const id = typeof feature === 'string' ? feature : feature.id;

      return featureLabels[id] ?? id;
    },
    featuresLabel: t('featuresLabel'),
    freeLabel: t('plans.free.name'),
    highlighted: plan.id === 'pro-yearly',
    limitLabel: (id, value) => (
      <span className="flex items-center justify-between gap-4">
        <span>{limitLabels[id] ?? id}</span>
        <span className="font-medium text-foreground">
          {value === null ? t('unlimited') : value.toLocaleString(locale)}
        </span>
      </span>
    ),
    limitsLabel: t('limitsLabel'),
    intervalLabel: (interval) => (interval === 'month' ? t('perMonth') : t('perYear')),
    creditsLabel: (credits) => t('credits', { count: credits }),
    formatCost: (paidPlan: PaidCatalogPlan) => (
      <span className="inline-flex items-baseline gap-2">
        <span>
          {new Intl.NumberFormat(locale, {
            currency: paidPlan.currency,
            style: 'currency',
          }).format(paidPlan.cost)}
        </span>
      </span>
    ),
    name: copy === undefined ? plan.name : t(copy.name),
    recommendedLabel: t('recommended'),
  };
}

function createPlanAction(
  plan: CatalogPlan,
  t: Awaited<ReturnType<typeof getTranslations>>,
): ReactNode {
  const copy = planCopy[plan.id];
  const label = copy === undefined ? t('comingSoon') : t(copy.cta);

  if (plan.kind === 'free') {
    return (
      <Link className={buttonVariants({ size: 'lg' })} href="/auth/sign-in">
        {label}
      </Link>
    );
  }

  return (
    <button className={buttonVariants({ size: 'lg', variant: 'secondary' })} disabled type="button">
      {label}
    </button>
  );
}
