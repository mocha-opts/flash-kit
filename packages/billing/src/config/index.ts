import type { BillingCapabilities, BillingProvider, CatalogPlan } from '#types';

export type BillingConfigBoundary = {
  readonly providers: readonly BillingProvider[];
  readonly catalog: readonly CatalogPlan[];
  readonly capabilities: BillingCapabilities;
};
