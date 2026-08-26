import { serverEnv } from '@repo/config/env/server';

import { getBillingProviderCapabilities } from '#config/provider-capabilities';
import { StripeBillingProvider } from '#providers/stripe/stripe-billing-provider';
import { type BillingClient, type BillingProvider, BillingUnavailableError } from '#types';

/** Composes the selected provider without exposing provider implementation types. */
export function createBillingClient(): BillingClient {
  const provider = serverEnv.BILLING_PROVIDER;

  if (provider === 'stripe') {
    return new StripeBillingProvider();
  }

  return createUnavailableBillingClient(provider);
}

function createUnavailableBillingClient(provider: BillingProvider): BillingClient {
  const unavailable = async (): Promise<never> => {
    throw new BillingUnavailableError(
      `Billing provider "${provider}" is not available in this deployment.`,
    );
  };

  return {
    provider,
    capabilities: getBillingProviderCapabilities(provider),
    createCheckout: unavailable,
    createPortal: unavailable,
    listSubscriptions: unavailable,
    cancelSubscription: unavailable,
    restoreSubscription: unavailable,
    getActivePlan: unavailable,
    hasFeature: unavailable,
  };
}
