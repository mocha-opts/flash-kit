import type { ReactNode } from 'react';

/** Billing component boundary props; children are optional content only. */
export type BillingComponentBoundaryProps = {
  readonly children?: ReactNode;
};

/** UI-only billing component contract without provider runtime access. */
export type BillingComponentsBoundary = (props: BillingComponentBoundaryProps) => ReactNode;
