import 'server-only';

import type { BillingCapabilities, BillingProvider, CatalogPlan } from '#types';

export { billingCatalog, getCatalogPlan } from './billing-catalog';
export { catalogPlanSchema, catalogSchema } from './catalog.schema';
export type {
  BillingCatalog,
  BillingCatalogInput,
  CatalogCurrency,
  CatalogPlanInput,
} from './catalog.types';
export {
  billingProviderCapabilities,
  getBillingProviderCapabilities,
} from './provider-capabilities';

/** Provider and catalog configuration consumed by billing server boundaries. */
export type BillingConfigBoundary = {
  readonly provider: BillingProvider;
  readonly catalog: readonly CatalogPlan[];
  readonly capabilities: BillingCapabilities;
};
