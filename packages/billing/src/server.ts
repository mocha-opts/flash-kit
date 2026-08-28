import 'server-only';

import type { BetterAuthPlugin } from '@better-auth/core';
import { db, withTransaction } from '@repo/db/client';
import { getCreditBalanceForUser, listCreditTransactionsForUser } from '@repo/db/queries/billing';

import { createBillingPlugin } from '#better-auth/create-billing-plugin';
import { createBillingClient } from '#billing/create-billing-client';
import { consumeCreditsInputSchema, consumeCreditsInTransaction } from '#credits/consume-credits';
import type {
  ActivePlan,
  BillingClient,
  ConsumeCreditsInput,
  ConsumeCreditsResult,
  CreditBalance,
  CreditTransactionsInput,
  CreditTransactionsPage,
  CreditTransactionView,
} from '#types';

export {
  disputePurchase,
  partialRefundPurchase,
  refundPurchase,
} from '#refunds/purchase-status';

/**
 * The only Auth integration seam. The selected official plugin owns its signed
 * Better Auth webhook; Stripe contributes its generated schema, while Polar
 * links customers through external Better Auth user ids without billing tables.
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

/** Returns the current integer credit balance for a trusted user id. */
export async function getCreditBalance(input: { readonly userId: string }): Promise<CreditBalance> {
  return {
    userId: input.userId,
    balance: await getCreditBalanceForUser(input.userId),
  };
}

/** Returns an immutable, provider-neutral page of the user's credit history. */
export async function listCreditTransactions(
  input: CreditTransactionsInput,
): Promise<CreditTransactionsPage> {
  const page = normalizePage(input.page);
  const limit = normalizeLimit(input.limit);
  const result = await listCreditTransactionsForUser({
    userId: input.userId,
    page,
    limit,
  });

  return {
    page,
    limit,
    hasNext: result.hasNext,
    items: result.items.map(
      ({ transaction, purchase }): CreditTransactionView => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        balanceAfter: transaction.balanceAfter,
        description: transaction.description,
        referenceType: transaction.referenceType,
        referenceId: transaction.referenceId,
        createdAt: transaction.createdAt.toISOString(),
        purchase: purchase
          ? {
              id: purchase.id,
              provider: purchase.provider,
              planId: purchase.planId,
              amount: purchase.amount,
              currency: purchase.currency,
              purchasedAt: purchase.purchasedAt.toISOString(),
            }
          : null,
      }),
    ),
  };
}

/**
 * Atomically consumes Credits for a trusted user and idempotent business
 * reference. This is a server API, not a public HTTP endpoint.
 */
export async function consumeCredits(input: ConsumeCreditsInput): Promise<ConsumeCreditsResult> {
  const normalized = consumeCreditsInputSchema.parse(input);

  return await withTransaction(db, async (transaction) =>
    consumeCreditsInTransaction(transaction, normalized),
  );
}

export { consumeCreditsInputSchema };

function normalizePage(page: number | undefined): number {
  if (page === undefined) {
    return 1;
  }

  if (!Number.isSafeInteger(page) || page < 1) {
    throw new RangeError('Credit transaction page must be a positive integer.');
  }

  return page;
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return 50;
  }

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError('Credit transaction limit must be an integer from 1 to 100.');
  }

  return limit;
}
