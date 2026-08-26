import { getCatalogPlan } from '#billing-config/index';

/** Reads the configured Stripe price id from the provider-neutral Catalog. */
export function getStripePriceId(planId: string): string {
  const plan = getCatalogPlan(planId);
  const priceId = plan?.kind !== 'free' ? plan?.providers.stripe?.priceId : undefined;

  if (!priceId) {
    throw new Error(`Catalog plan "${planId}" is missing a Stripe price ID.`);
  }

  return priceId;
}
