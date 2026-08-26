import type { BillingCapabilities, BillingProvider } from '#types';

type BillingCatalogIdRequirements = {
  readonly productId: true;
  readonly priceId: boolean;
};

/**
 * Provider capabilities and catalog requirements are centralized here while the
 * latter remain an internal validation concern. Both supported providers expose
 * checkout and subscription lifecycle operations through this contract. Pricing
 * UI and settings pages consume this contract and never branch on provider names.
 */
export const billingProviderCapabilities = {
  stripe: {
    checkout: true,
    customerPortal: true,
    cancelSubscription: true,
    restoreSubscription: true,
  },
  polar: {
    checkout: true,
    customerPortal: true,
    cancelSubscription: true,
    restoreSubscription: true,
  },
} as const satisfies Record<BillingProvider, BillingCapabilities>;

/** Internal catalog ID requirements used only while parsing deployment config. */
export const billingProviderCatalogIdRequirements = {
  stripe: {
    productId: true,
    priceId: true,
  },
  polar: {
    productId: true,
    priceId: false,
  },
} as const satisfies Record<BillingProvider, BillingCatalogIdRequirements>;

/** Returns the immutable capability contract for the selected deployment provider. */
export function getBillingProviderCapabilities(provider: BillingProvider): BillingCapabilities {
  return billingProviderCapabilities[provider];
}
