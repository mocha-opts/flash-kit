import type { ReactNode } from 'react';

import type { CatalogPlan } from '#types';

import { PlanCard, type PlanCardProps } from './plan-card';

/** Props shared by every plan card in a pricing table. */
export type PricingTableCardProps = Omit<PlanCardProps, 'plan'>;

/** Provider-neutral pricing table props; localized labels belong to the caller. */
export type PricingTableProps = {
  readonly plans: readonly CatalogPlan[];
  readonly title?: ReactNode;
  readonly description?: ReactNode;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly planCardProps?: PricingTableCardProps | ((plan: CatalogPlan) => PricingTableCardProps);
};

/**
 * Renders catalog plans in a responsive grid.
 *
 * This component intentionally has no knowledge of Stripe, Polar, or checkout
 * routes. Callers provide safe actions (or an explicit coming-soon message).
 */
export function PricingTable({
  plans,
  title,
  description,
  ariaLabel = 'Pricing plans',
  className,
  planCardProps,
}: PricingTableProps): ReactNode {
  return (
    <section aria-label={ariaLabel} className={['grid gap-8', className].filter(Boolean).join(' ')}>
      {title || description ? (
        <header className="grid gap-3">
          {title ? <h2 className="text-3xl font-semibold tracking-tight">{title}</h2> : null}
          {description ? (
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
          ) : null}
        </header>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const cardProps =
            typeof planCardProps === 'function' ? planCardProps(plan) : (planCardProps ?? {});

          return <PlanCard key={plan.id} plan={plan} {...cardProps} />;
        })}
      </div>
    </section>
  );
}
