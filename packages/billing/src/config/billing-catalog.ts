import 'server-only';

import { serverEnv } from '@repo/config/env/server';
import { catalogSchema } from './catalog.schema';
import type { BillingCatalog } from './catalog.types';

function optionalEnvironmentValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  return normalized === '' ? undefined : normalized;
}

/**
 * Builds an optional provider reference from deployment configuration.
 *
 * A reference is omitted when no product ID is configured so the catalog schema
 * can report the selected provider, plan, and exact provider path in one error.
 */
function providerReference(
  productId: string | undefined,
  priceId?: string,
): { readonly productId: string; readonly priceId?: string } | undefined {
  const product = optionalEnvironmentValue(productId);

  if (product === undefined) {
    return undefined;
  }

  const price = optionalEnvironmentValue(priceId);

  return price === undefined ? { productId: product } : { productId: product, priceId: price };
}

/**
 * Code-owned product semantics and display values.
 *
 * `cost` is deliberately display-only. Later checkout, webhook, refund, and
 * accounting code must resolve the active provider's IDs from this catalog and
 * use provider-returned payment facts for monetary records.
 */
const catalogInput = {
  provider: serverEnv.BILLING_PROVIDER,
  plans: [
    {
      id: 'free',
      kind: 'free',
      name: 'Free',
      features: [{ id: 'core_workspace' }],
      limits: {
        projects: 1,
        generations_per_month: 10,
      },
    },
    {
      id: 'pro-monthly',
      kind: 'subscription',
      interval: 'month',
      name: 'Pro monthly',
      features: [{ id: 'core_workspace' }, { id: 'advanced_generation' }],
      limits: {
        projects: null,
        generations_per_month: 1000,
      },
      cost: 12,
      currency: 'USD',
      providers: {
        stripe: providerReference(
          serverEnv.STRIPE_PRODUCT_PRO_MONTHLY,
          serverEnv.STRIPE_PRICE_PRO_MONTHLY,
        ),
        polar: providerReference(
          serverEnv.POLAR_PRODUCT_PRO_MONTHLY,
          serverEnv.POLAR_PRICE_PRO_MONTHLY,
        ),
      },
    },
    {
      id: 'pro-yearly',
      kind: 'subscription',
      interval: 'year',
      name: 'Pro yearly',
      features: [{ id: 'core_workspace' }, { id: 'advanced_generation' }],
      limits: {
        projects: null,
        generations_per_month: 1000,
      },
      cost: 120,
      currency: 'USD',
      providers: {
        stripe: providerReference(
          serverEnv.STRIPE_PRODUCT_PRO_YEARLY,
          serverEnv.STRIPE_PRICE_PRO_YEARLY,
        ),
        polar: providerReference(
          serverEnv.POLAR_PRODUCT_PRO_YEARLY,
          serverEnv.POLAR_PRICE_PRO_YEARLY,
        ),
      },
    },
    {
      id: 'lifetime',
      kind: 'lifetime',
      name: 'Lifetime',
      features: [{ id: 'core_workspace' }, { id: 'advanced_generation' }],
      limits: {
        projects: null,
        generations_per_month: null,
      },
      cost: 299,
      currency: 'USD',
      providers: {
        stripe: providerReference(
          serverEnv.STRIPE_PRODUCT_LIFETIME,
          serverEnv.STRIPE_PRICE_LIFETIME,
        ),
        polar: providerReference(serverEnv.POLAR_PRODUCT_LIFETIME, serverEnv.POLAR_PRICE_LIFETIME),
      },
    },
    {
      id: 'credit-pack-100',
      kind: 'credit-package',
      name: '100 credits',
      features: [{ id: 'generation_credits' }],
      limits: {},
      credits: 100,
      cost: 15,
      currency: 'USD',
      providers: {
        stripe: providerReference(
          serverEnv.STRIPE_PRODUCT_CREDIT_PACK_100,
          serverEnv.STRIPE_PRICE_CREDIT_PACK_100,
        ),
        polar: providerReference(
          serverEnv.POLAR_PRODUCT_CREDIT_PACK_100,
          serverEnv.POLAR_PRICE_CREDIT_PACK_100,
        ),
      },
    },
  ],
} as const;

/** Parsed active-deployment catalog; importing this value validates its IDs. */
export const billingCatalog: BillingCatalog = catalogSchema.parse(catalogInput);

/** Returns a stable plan by catalog ID, or null when the ID is not in the catalog. */
export function getCatalogPlan(planId: string): BillingCatalog['plans'][number] | null {
  const plan = billingCatalog.plans.find((candidate) => candidate.id === planId);

  return plan ?? null;
}
