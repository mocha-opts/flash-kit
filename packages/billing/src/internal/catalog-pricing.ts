import { billingCatalog, getCatalogPlan } from '#billing-config/index';

/** Reads the configured Stripe product id from the provider-neutral Catalog. */
export function getStripeProductId(planId: string): string {
  const plan = getCatalogPlan(planId);
  const productId = plan?.kind !== 'free' ? plan?.providers.stripe?.productId : undefined;

  if (!productId) {
    throw new Error(`Catalog plan "${planId}" is missing a Stripe product ID.`);
  }

  return productId;
}

/** Reads the configured Stripe price id from the provider-neutral Catalog. */
export function getStripePriceId(planId: string): string {
  const plan = getCatalogPlan(planId);
  const priceId = plan?.kind !== 'free' ? plan?.providers.stripe?.priceId : undefined;

  if (!priceId) {
    throw new Error(`Catalog plan "${planId}" is missing a Stripe price ID.`);
  }

  return priceId;
}

/** Reads the configured Polar product id from the provider-neutral Catalog. */
export function getPolarProductId(planId: string): string {
  const plan = getCatalogPlan(planId);
  const productId = plan?.kind !== 'free' ? plan?.providers.polar?.productId : undefined;

  if (!productId) {
    throw new Error(`Catalog plan "${planId}" is missing a Polar product ID.`);
  }

  return productId;
}

/** Resolves a catalog plan from a Polar product returned by the provider. */
export function getCatalogPlanIdForPolarProduct(productId: string): string | undefined {
  return billingCatalog.plans.find(
    (plan) => plan.kind === 'subscription' && plan.providers.polar?.productId === productId,
  )?.id;
}
