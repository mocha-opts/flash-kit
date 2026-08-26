import { serverEnv } from '@repo/config/env/server';
import Stripe from 'stripe';

/** Creates the private Stripe SDK client for the selected deployment. */
export function createStripeClient(): Stripe {
  const secretKey = serverEnv.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required when Stripe billing is selected.');
  }

  return new Stripe(secretKey, {
    maxNetworkRetries: 0,
    typescript: true,
  });
}

/** Converts provider failures to the stable BillingUnavailableError at the caller boundary. */
export function isStripeProviderFailure(error: unknown): boolean {
  return error instanceof Stripe.errors.StripeError;
}
