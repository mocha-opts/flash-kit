import type { ReactNode } from 'react';

export type BillingComponentBoundaryProps = {
  readonly children?: ReactNode;
};

export type BillingComponentsBoundary = (props: BillingComponentBoundaryProps) => ReactNode;
