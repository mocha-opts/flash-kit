import type { BillingCapabilities, BillingProvider } from '#types';

type BillingCatalogIdRequirements = {
  readonly productId: true;
  readonly priceId: boolean;
};

/**
 * Provider capabilities and catalog requirements are centralized here while the
 * latter remain an internal validation concern. Pricing UI must consume the
 * catalog and never branch on provider names. Checkout capabilities remain
 * false until a later ticket wires the provider SDKs and server actions.
 */
export const billingProviderCapabilities = {
  stripe: {
    checkout: false,
    customerPortal: false,
    cancelSubscription: false,
    restoreSubscription: false,
  },
  polar: {
    checkout: false,
    customerPortal: false,
    cancelSubscription: false,
    restoreSubscription: false,
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
