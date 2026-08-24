import type { BillingCapabilities, BillingProvider, CatalogPlan } from '#types';

/** Provider and catalog configuration consumed by billing server boundaries. */
export type BillingConfigBoundary = {
  readonly providers: readonly BillingProvider[];
  readonly catalog: readonly CatalogPlan[];
  readonly capabilities: BillingCapabilities;
};
