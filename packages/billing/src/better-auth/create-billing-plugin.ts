import { stripe } from '@better-auth/stripe';
import { serverEnv } from '@repo/config/env/server';

import { getCatalogPlan } from '#billing-config/index';

import { getStripePriceId } from '#internal/catalog-pricing';
import { createStripeClient } from '#providers/stripe/stripe-client';

/**
 * Creates the official Better Auth Stripe plugin for the active deployment.
 *
 * The plugin owns its signed `/api/auth/stripe/webhook` endpoint and its
 * generated `user.stripeCustomerId`/`subscription` schema. Auth only installs
 * the returned plugin; it never imports Stripe or plugin implementation types.
 */
export function createBillingPlugin() {
  if (serverEnv.BILLING_PROVIDER !== 'stripe') {
    return undefined;
  }

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
