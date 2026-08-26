import 'server-only';

import type { BetterAuthPlugin } from '@better-auth/core';

import { createBillingPlugin } from '#better-auth/create-billing-plugin';
import { createBillingClient } from '#billing/create-billing-client';
import type {
  ActivePlan,
  BillingClient,
  ConsumeCreditsInput,
  CreditBalance,
  CreditTransactionsInput,
  CreditTransactionView,
} from '#types';

/**
 * The only Auth integration seam. The returned official plugin owns the
 * signed Better Auth webhook and generated subscription schema.
 */
export function createBetterAuthBillingPlugin(): BetterAuthPlugin | undefined {
  return createBillingPlugin();
}

/** Returns the selected deployment's provider-neutral billing client. */
export function getBilling(): BillingClient {
  return createBillingClient();
}

/** Resolves the current user's active plan through the selected BillingClient. */
export async function getActivePlan(input: { readonly userId: string }): Promise<ActivePlan> {
  return await createBillingClient().getActivePlan(input);
}

/** Provider-neutral feature check; provider failures are never treated as Free. */
export async function hasFeature(input: {
  readonly userId: string;
  readonly feature: string;
}): Promise<boolean> {
  return await createBillingClient().hasFeature(input);
}

/**
 * Stable credit read boundary. The credit ledger is intentionally owned by a
 * later billing ticket; keep this export available without pretending T09
 * implements accounting.
 */
export async function getCreditBalance(_input: {
  readonly userId: string;
}): Promise<CreditBalance> {
  throw new Error('Credit operations are not implemented until a later billing ticket.');
}

/** Stable credit history boundary reserved for a later billing ticket. */
export async function listCreditTransactions(
  _input: CreditTransactionsInput,
): Promise<readonly CreditTransactionView[]> {
  throw new Error('Credit operations are not implemented until a later billing ticket.');
}

/** Stable atomic credit-consumption boundary reserved for a later billing ticket. */
export async function consumeCredits(_input: ConsumeCreditsInput): Promise<never> {
  throw new Error('Credit operations are not implemented until a later billing ticket.');
}
