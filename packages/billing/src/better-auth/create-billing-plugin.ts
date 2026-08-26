import { stripe } from '@better-auth/stripe';
import { polar, portal, webhooks } from '@polar-sh/better-auth';
import { serverEnv } from '@repo/config/env/server';

import { getCatalogPlan } from '#billing-config/index';

import { getStripePriceId } from '#internal/catalog-pricing';
import { getBillingReturnUrl } from '#internal/trusted-return-urls';
import { createPolarClient } from '#providers/polar/polar-client';
import { createStripeClient } from '#providers/stripe/stripe-client';

/**
 * Creates the official Better Auth billing plugin for the active deployment.
 *
 * The selected provider owns its signed catch-all webhook endpoint. Auth only
 * installs the returned plugin; it never imports provider implementation types.
 */
export function createBillingPlugin() {
  if (serverEnv.BILLING_PROVIDER === 'stripe') {
    return createStripeBillingPlugin();
  }

  if (serverEnv.BILLING_PROVIDER === 'polar') {
    return createPolarBillingPlugin();
  }

  return undefined;
}

function createStripeBillingPlugin() {
  return stripe({
    stripeClient: createStripeClient(),
    stripeWebhookSecret: requireStripeWebhookSecret(),
    createCustomerOnSignUp: true,
    subscription: {
      enabled: true,
      plans: createStripePlans(),
      requireEmailVerification: true,
      authorizeReference: async ({ user, referenceId }) => referenceId === user.id,
    },
  });
}

/**
 * Creates the official Polar integration for customer lifecycle, portal, and
 * signed webhook handling. Application checkout stays on BillingClient so the
 * Catalog and active-subscription guard cannot be bypassed by an Auth route.
 */
function createPolarBillingPlugin() {
  return polar({
    client: createPolarClient(),
    createCustomerOnSignUp: true,
    use: [
      portal({ returnUrl: getBillingReturnUrl('en') }),
      webhooks({ secret: requirePolarWebhookSecret() }),
    ],
  });
}

function createStripePlans() {
  const monthly = getSubscriptionPlan('pro-monthly');
  const yearly = getSubscriptionPlan('pro-yearly');
  const monthlyPriceId = getStripePriceId(monthly.id);
  const yearlyPriceId = getStripePriceId(yearly.id);

  return [
    {
      name: 'pro',
      priceId: monthlyPriceId,
      annualDiscountPriceId: yearlyPriceId,
      limits: Object.fromEntries(Object.entries(monthly.limits)),
    },
  ];
}

function getSubscriptionPlan(planId: string) {
  const plan = getCatalogPlan(planId);

  if (plan?.kind !== 'subscription') {
    throw new Error(`Catalog plan "${planId}" must be a subscription.`);
  }

  return plan;
}

function requireStripeWebhookSecret(): string {
  const secret = serverEnv.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is required when Stripe billing is selected.');
  }

  return secret;
}

function requirePolarWebhookSecret(): string {
  const secret = serverEnv.POLAR_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('POLAR_WEBHOOK_SECRET is required when Polar billing is selected.');
  }

  return secret;
}
