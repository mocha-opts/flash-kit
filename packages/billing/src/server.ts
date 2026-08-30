import 'server-only';

import type { BetterAuthPlugin } from '@better-auth/core';
import { db, withTransaction } from '@repo/db/client';
import {
  type CreditTransactionWithPurchase,
  getActiveLifetimePurchaseForUser,
  getBillingUser,
  getCreditBalanceForUser,
  listCreditTransactionsForUser,
} from '@repo/db/queries/billing';

import { createBillingPlugin } from '#better-auth/create-billing-plugin';
import { createBillingClient } from '#billing/create-billing-client';
import { adjustCreditsInputSchema, adjustCreditsInTransaction } from '#credits/adjust-credits';
import { consumeCreditsInputSchema, consumeCreditsInTransaction } from '#credits/consume-credits';
import type {
  AccountDeletionPreview,
  ActivePlan,
  AdjustCreditsInput,
  AdjustCreditsResult,
  BillingClient,
  BillingNotificationOptions,
  ConsumeCreditsInput,
  ConsumeCreditsResult,
  CreditBalance,
  CreditManagementView,
  CreditTransactionsInput,
  CreditTransactionsPage,
  CreditTransactionView,
} from '#types';
import {
  AccountDeletionActiveSubscriptionError,
  AccountDeletionSubscriptionStateError,
} from '#types';

export {
  disputePurchase,
  partialRefundPurchase,
  refundPurchase,
} from '#refunds/purchase-status';
export type {
  BillingNotification,
  BillingNotificationOptions,
  BillingNotificationSender,
  PaymentFailedBillingNotification,
  PurchaseReceiptBillingNotification,
} from '#types';

/**
 * The only Auth integration seam. The selected official plugin owns its signed
 * Better Auth webhook; Stripe contributes its generated schema, while Polar
 * links customers through external Better Auth user ids without billing tables.
 */
export function createBetterAuthBillingPlugin(
  options: BillingNotificationOptions = {},
): BetterAuthPlugin | undefined {
  return createBillingPlugin(options);
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
 * Returns deletion warnings from local durable Billing facts only. Provider
 * availability is intentionally checked at mutation time, immediately before deletion.
 */
export async function getAccountDeletionPreview(input: {
  readonly userId: string;
}): Promise<AccountDeletionPreview> {
  const [lifetimePurchase, creditBalance, creditHistory] = await Promise.all([
    getActiveLifetimePurchaseForUser(input.userId),
    getCreditBalanceForUser(input.userId),
    listCreditTransactionsForUser({ userId: input.userId, page: 1, limit: 1 }),
  ]);

  return {
    hasLifetimeAccess: lifetimePurchase !== null,
    creditBalance,
    hasCreditHistory: creditHistory.items.length > 0,
  };
}

/**
 * Queries the selected Provider and fails closed unless every returned
 * subscription is explicitly canceled. Provider failures propagate unchanged.
 */
export async function assertAccountDeletionAllowed(input: {
  readonly userId: string;
}): Promise<void> {
  const subscriptions = await createBillingClient().listSubscriptions(input);

  if (
    subscriptions.some(
      (subscription) => subscription.status === 'active' || subscription.status === 'trialing',
    )
  ) {
    throw new AccountDeletionActiveSubscriptionError();
  }

  if (subscriptions.some((subscription) => subscription.status !== 'canceled')) {
    throw new AccountDeletionSubscriptionStateError();
  }
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
    items: result.items.map(toCreditTransactionView),
  };
}

/**
 * Loads one target user's identity, current balance, and recent immutable
 * history for a caller that has already enforced its management authorization.
 */
export async function getCreditManagementView(input: {
  readonly userId: string;
  readonly limit?: number;
}): Promise<CreditManagementView | null> {
  const user = await getBillingUser(input.userId);

  if (!user) {
    return null;
  }

  const page = 1;
  const limit = normalizeLimit(input.limit);
  const [balance, transactions] = await Promise.all([
    getCreditBalance({ userId: user.id }),
    listCreditTransactionsForUser({ userId: user.id, page, limit }),
  ]);

  return {
    user: { id: user.id, name: user.name, email: user.email },
    balance,
    transactions: {
      page,
      limit,
      hasNext: transactions.hasNext,
      items: transactions.items.map((item) => ({
        ...toCreditTransactionView(item),
        actorUserId: item.transaction.actorUserId,
      })),
    },
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

/**
 * Atomically applies a signed Credit adjustment for a caller that has already
 * authorized the actor as an Admin. This private server API is not an HTTP route.
 */
export async function adjustCredits(input: AdjustCreditsInput): Promise<AdjustCreditsResult> {
  const normalized = adjustCreditsInputSchema.parse(input);

  return await withTransaction(db, async (transaction) =>
    adjustCreditsInTransaction(transaction, normalized),
  );
}

export { adjustCreditsInputSchema, consumeCreditsInputSchema };

function toCreditTransactionView({
  transaction,
  purchase,
}: CreditTransactionWithPurchase): CreditTransactionView {
  return {
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
  };
}

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
