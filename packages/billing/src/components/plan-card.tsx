import type { ReactNode } from 'react';

import type {
  BillingFeature,
  CatalogPlan,
  CreditPackagePlan,
  LifetimePlan,
  SubscriptionPlan,
} from '#types';

/** A paid catalog plan accepted by display formatters. */
export type PaidCatalogPlan = SubscriptionPlan | LifetimePlan | CreditPackagePlan;

/**
 * Display callbacks keep product copy and localization in the consuming app.
 * The component never resolves provider IDs or starts a checkout.
 */
export type PlanCardProps = {
  readonly plan: CatalogPlan;
  readonly action?: ReactNode;
  readonly className?: string;
  readonly description?: ReactNode;
  readonly highlighted?: boolean;
  /** Localized display name; falls back to the catalog's stable name. */
  readonly name?: ReactNode;
  readonly featureLabel?: (feature: BillingFeature) => ReactNode;
  readonly featuresLabel?: ReactNode;
  readonly freeLabel?: ReactNode;
  readonly creditsLabel?: (credits: number) => ReactNode;
  readonly limitLabel?: (id: string, value: number | null) => ReactNode;
  readonly limitsLabel?: ReactNode;
  readonly intervalLabel?: (interval: SubscriptionPlan['interval']) => ReactNode;
  readonly formatCost?: (plan: PaidCatalogPlan) => ReactNode;
  readonly recommendedLabel?: ReactNode;
};

/**
 * Renders one provider-neutral catalog plan as an accessible article.
 *
 * `cost` is rendered only as display text. It is not passed to an action and
 * must not be used by a caller as a checkout amount.
 */
export function PlanCard({
  plan,
  action,
  className,
  description,
  highlighted = false,
  name,
  featureLabel = defaultFeatureLabel,
  featuresLabel = 'Features',
  freeLabel = 'Free',
  creditsLabel = defaultCreditsLabel,
  limitLabel = defaultLimitLabel,
  limitsLabel = 'Limits',
  intervalLabel = defaultIntervalLabel,
  formatCost = defaultCostLabel,
  recommendedLabel = 'Recommended',
}: PlanCardProps): ReactNode {
  const headingId = `billing-plan-${plan.id}`;
  const featureItems = plan.features.map((feature) => {
    const id = typeof feature === 'string' ? feature : feature.id;

    return <li key={id}>{featureLabel(feature)}</li>;
  });
  const limitItems = Object.entries(plan.limits).map(([id, value]) => (
    <li key={id}>{limitLabel(id, value)}</li>
  ));

  return (
    <article
      aria-labelledby={headingId}
      className={[
        'flex h-full flex-col rounded-xl border bg-card p-6 text-card-foreground shadow-sm',
        highlighted ? 'border-primary ring-1 ring-primary' : 'border-border',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-plan-kind={plan.kind}
      data-plan-id={plan.id}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight" id={headingId}>
            {name ?? plan.name}
          </h3>
          {plan.kind === 'subscription' ? (
            <p className="mt-1 text-sm text-muted-foreground">{intervalLabel(plan.interval)}</p>
          ) : null}
        </div>
        {highlighted ? (
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            {recommendedLabel}
          </span>
        ) : null}
      </div>

      <div className="mt-6 min-h-12">
        {plan.kind === 'free' ? (
          <p className="text-3xl font-semibold tracking-tight">{freeLabel}</p>
        ) : (
          <p className="text-3xl font-semibold tracking-tight">{formatCost(plan)}</p>
        )}
        {plan.kind === 'credit-package' ? (
          <p className="mt-1 text-sm text-muted-foreground">{creditsLabel(plan.credits)}</p>
        ) : null}
      </div>

      {description ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{description}</p>
      ) : null}

      {featureItems.length > 0 ? (
        <section
          className="mt-6"
          aria-label={typeof featuresLabel === 'string' ? featuresLabel : undefined}
        >
          {featuresLabel ? <h4 className="sr-only">{featuresLabel}</h4> : null}
          <ul className="grid gap-3 text-sm leading-6">{featureItems}</ul>
        </section>
      ) : null}

      {limitItems.length > 0 ? (
        <section
          className="mt-5 border-t border-border pt-5"
          aria-label={typeof limitsLabel === 'string' ? limitsLabel : undefined}
        >
          {limitsLabel ? <h4 className="sr-only">{limitsLabel}</h4> : null}
          <ul className="grid gap-2 text-sm text-muted-foreground">{limitItems}</ul>
        </section>
      ) : null}

      {action ? <div className="mt-auto pt-7">{action}</div> : null}
    </article>
  );
}

function defaultFeatureLabel(feature: BillingFeature): ReactNode {
  return typeof feature === 'string' ? feature : feature.id;
}

function defaultLimitLabel(id: string, value: number | null): ReactNode {
  return `${id}: ${value === null ? 'unlimited' : value}`;
}

function defaultIntervalLabel(interval: SubscriptionPlan['interval']): ReactNode {
  return `per ${interval}`;
}

function defaultCreditsLabel(credits: number): ReactNode {
  return `${credits} credits`;
}

function defaultCostLabel(plan: PaidCatalogPlan): ReactNode {
  return `${plan.currency} ${plan.cost}`;
}
