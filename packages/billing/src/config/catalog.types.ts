import type {
  BillingFeature,
  BillingLimits,
  BillingPlanKind,
  CatalogPlan,
  CatalogProviderIds,
} from '#types';

/** ISO 4217 currency code in the uppercase form used by the catalog. */
export type CatalogCurrency = string;

/** Shared input shape used while assembling the code-owned product catalog. */
export type CatalogPlanInput = {
  readonly id: string;
  readonly kind: BillingPlanKind;
  readonly name: string;
  readonly features: readonly BillingFeature[];
  readonly limits: BillingLimits;
  readonly providers?: CatalogProviderIds;
  readonly interval?: 'month' | 'year';
  readonly cost?: number;
  readonly currency?: CatalogCurrency;
  readonly credits?: number;
};

/** Provider-neutral catalog input before the selected-provider checks run. */
export type BillingCatalogInput = {
  readonly provider: 'stripe' | 'polar';
  readonly plans: readonly CatalogPlanInput[];
};

/** Parsed, provider-neutral catalog with all product invariants satisfied. */
export type BillingCatalog = {
  readonly provider: BillingCatalogInput['provider'];
  readonly plans: readonly CatalogPlan[];
};
