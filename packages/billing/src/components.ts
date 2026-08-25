import type { ReactNode } from 'react';

export type { PaidCatalogPlan, PlanCardProps } from './components/plan-card';
export { PlanCard } from './components/plan-card';
export type { PricingTableCardProps, PricingTableProps } from './components/pricing-table';
export { PricingTable } from './components/pricing-table';

/** Billing component boundary props; children are optional content only. */
export type BillingComponentBoundaryProps = {
  readonly children?: ReactNode;
};

/** UI-only billing component contract without provider runtime access. */
export type BillingComponentsBoundary = (props: BillingComponentBoundaryProps) => ReactNode;
