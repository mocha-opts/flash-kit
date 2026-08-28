import 'server-only';

import { type DatabaseTransaction, db, withTransaction } from '@repo/db/client';
import {
  lockBillingPurchaseForUserByProviderOrder,
  transitionBillingPurchaseStatus,
} from '@repo/db/queries/billing';
import { z } from 'zod';

import {
  appendCreditRefundCompensation,
  getRecordedCreditRefundCompensation,
} from '#credits/refund-purchase-credits';
import {
  BillingPurchaseNotFoundError,
  BillingPurchaseStatusConflictError,
  type CreditRefundCompensation,
  type PurchaseDisputeInput,
  type PurchaseDisputeOutcome,
  type PurchaseDisputeResult,
  type PurchasePartialRefundResult,
  type PurchaseRefundResult,
  type PurchaseStatusMutationInput,
} from '#types';

const disputeOutcomes = ['active', 'lost', 'won'] as const;

const purchaseStatusMutationSchema = z.strictObject({
  userId: z.string().uuid('Purchase status changes require a valid user id.'),
  provider: z.enum(['stripe', 'polar']),
  providerOrderId: z
    .string()
    .trim()
    .min(1, 'Purchase provider order id must not be empty.')
    .max(255, 'Purchase provider order id must not exceed 255 characters.'),
});

const purchaseDisputeSchema = purchaseStatusMutationSchema.extend({
  outcome: z.enum(disputeOutcomes).optional(),
});

/**
 * Applies a full refund in one caller-owned transaction. A Credit Pack keeps
 * its original purchase grant and receives one signed negative compensation
 * entry derived from that historical grant.
 */
export async function refundPurchase(
  input: PurchaseStatusMutationInput,
): Promise<PurchaseRefundResult> {
  const normalized = purchaseStatusMutationSchema.parse(input);

  return await withTransaction(db, async (transaction) =>
    refundPurchaseInTransaction(transaction, normalized),
  );
}

/**
 * Caller-owned transaction seam for webhook/event composition. The Purchase
 * row lock serializes refund/dispute races; the Credit Account lock serializes
 * the compensation with consumption and grant mutations.
 */
export async function refundPurchaseInTransaction(
  transaction: DatabaseTransaction,
  input: PurchaseStatusMutationInput,
): Promise<PurchaseRefundResult> {
  const normalized = purchaseStatusMutationSchema.parse(input);
  const purchase = await lockBillingPurchaseForUserByProviderOrder(transaction, normalized);

  if (!purchase) {
    throw new BillingPurchaseNotFoundError();
  }

  if (purchase.status === 'refunded') {
    const creditCompensation =
      purchase.kind === 'credit_pack'
        ? await getRecordedCreditRefundCompensation(transaction, purchase)
        : null;

    return toRefundResult(purchase, false, creditCompensation);
  }

  if (
    purchase.status !== 'paid' &&
    purchase.status !== 'disputed' &&
    purchase.status !== 'partially_refunded'
  ) {
    throw new BillingPurchaseStatusConflictError(
      `A full refund cannot be applied to Purchase status "${purchase.status}".`,
    );
  }

  const creditCompensation =
    purchase.kind === 'credit_pack'
      ? await appendCreditRefundCompensation(transaction, purchase)
      : null;
  const updatedPurchase = await transitionBillingPurchaseStatus(transaction, {
    userId: normalized.userId,
    provider: normalized.provider,
    providerOrderId: normalized.providerOrderId,
    purchaseId: purchase.id,
    currentStatus: purchase.status,
    nextStatus: 'refunded',
  });

  if (!updatedPurchase) {
    throw new BillingPurchaseStatusConflictError();
  }

  return toRefundResult(updatedPurchase, true, creditCompensation);
}

/**
 * Applies a provider-confirmed partial refund in one caller-owned
 * transaction. It only changes Purchase status; any financial adjustment is
 * an explicit later Admin operation and never rewrites the Credit ledger.
 */
export async function partialRefundPurchase(
  input: PurchaseStatusMutationInput,
): Promise<PurchasePartialRefundResult> {
  const normalized = purchaseStatusMutationSchema.parse(input);

  return await withTransaction(db, async (transaction) =>
    partialRefundPurchaseInTransaction(transaction, normalized),
  );
}

/** Caller-owned transaction seam for partial refund event composition. */
export async function partialRefundPurchaseInTransaction(
  transaction: DatabaseTransaction,
  input: PurchaseStatusMutationInput,
): Promise<PurchasePartialRefundResult> {
  const normalized = purchaseStatusMutationSchema.parse(input);
  const purchase = await lockBillingPurchaseForUserByProviderOrder(transaction, normalized);

  if (!purchase) {
    throw new BillingPurchaseNotFoundError();
  }

  if (purchase.status === 'refunded') {
    return toPartialRefundResult(purchase, false);
  }

  if (purchase.status === 'partially_refunded') {
    return toPartialRefundResult(purchase, false);
  }

  if (purchase.status !== 'paid' && purchase.status !== 'disputed') {
    throw new BillingPurchaseStatusConflictError(
      `A partial refund cannot be applied to Purchase status "${purchase.status}".`,
    );
  }

  const updatedPurchase = await transitionBillingPurchaseStatus(transaction, {
    userId: normalized.userId,
    provider: normalized.provider,
    providerOrderId: normalized.providerOrderId,
    purchaseId: purchase.id,
    currentStatus: purchase.status,
    nextStatus: 'partially_refunded',
  });

  if (!updatedPurchase) {
    throw new BillingPurchaseStatusConflictError();
  }

  return toPartialRefundResult(updatedPurchase, true);
}

/**
 * Applies a provider dispute in one caller-owned transaction. A dispute
 * revokes Lifetime access and marks Credit Packs disputed, but does not add a
 * Credit compensation: the authoritative design compensates only a later
 * full refund, using the historical grant amount.
 */
export async function disputePurchase(input: PurchaseDisputeInput): Promise<PurchaseDisputeResult> {
  const normalized = purchaseDisputeSchema.parse(input);

  return await withTransaction(db, async (transaction) =>
    disputePurchaseInTransaction(transaction, normalized),
  );
}

/** Caller-owned transaction seam for provider webhook/event composition. */
export async function disputePurchaseInTransaction(
  transaction: DatabaseTransaction,
  input: PurchaseDisputeInput,
): Promise<PurchaseDisputeResult> {
  const normalized = purchaseDisputeSchema.parse(input);
  const purchase = await lockBillingPurchaseForUserByProviderOrder(transaction, normalized);
  const outcome: PurchaseDisputeOutcome = normalized.outcome ?? 'active';

  if (!purchase) {
    throw new BillingPurchaseNotFoundError();
  }

  if (outcome === 'won') {
    if (purchase.status === 'refunded') {
      return toDisputeResult(purchase, false, outcome);
    }

    if (purchase.status === 'disputed') {
      const restoredPurchase = await transitionBillingPurchaseStatus(transaction, {
        userId: normalized.userId,
        provider: normalized.provider,
        providerOrderId: normalized.providerOrderId,
        purchaseId: purchase.id,
        currentStatus: 'disputed',
        nextStatus: 'paid',
      });

      if (!restoredPurchase) {
        throw new BillingPurchaseStatusConflictError();
      }

      return toDisputeResult(restoredPurchase, true, outcome);
    }

    return toDisputeResult(purchase, false, outcome);
  }

  if (purchase.status === 'refunded') {
    return toDisputeResult(purchase, false, outcome);
  }

  if (purchase.status === 'disputed') {
    return toDisputeResult(purchase, false, outcome);
  }

  if (purchase.status !== 'paid' && purchase.status !== 'partially_refunded') {
    throw new BillingPurchaseStatusConflictError(
      `A dispute cannot be applied to Purchase status "${purchase.status}".`,
    );
  }

  const updatedPurchase = await transitionBillingPurchaseStatus(transaction, {
    userId: normalized.userId,
    provider: normalized.provider,
    providerOrderId: normalized.providerOrderId,
    purchaseId: purchase.id,
    currentStatus: purchase.status,
    nextStatus: 'disputed',
  });

  if (!updatedPurchase) {
    throw new BillingPurchaseStatusConflictError();
  }

  return toDisputeResult(updatedPurchase, true, outcome);
}

function toRefundResult(
  purchase: {
    readonly id: string;
    readonly provider: 'stripe' | 'polar';
    readonly providerOrderId: string;
    readonly kind: 'lifetime' | 'credit_pack';
  },
  changed: boolean,
  creditCompensation: CreditRefundCompensation | null,
): PurchaseRefundResult {
  return {
    purchaseId: purchase.id,
    provider: purchase.provider,
    providerOrderId: purchase.providerOrderId,
    kind: purchase.kind,
    status: 'refunded',
    changed,
    creditCompensation,
  };
}

function toPartialRefundResult(
  purchase: {
    readonly id: string;
    readonly provider: 'stripe' | 'polar';
    readonly providerOrderId: string;
    readonly kind: 'lifetime' | 'credit_pack';
    readonly status: 'paid' | 'partially_refunded' | 'refunded' | 'disputed';
  },
  changed: boolean,
): PurchasePartialRefundResult {
  if (purchase.status !== 'partially_refunded' && purchase.status !== 'refunded') {
    throw new BillingPurchaseStatusConflictError();
  }

  return {
    purchaseId: purchase.id,
    provider: purchase.provider,
    providerOrderId: purchase.providerOrderId,
    kind: purchase.kind,
    status: purchase.status,
    changed,
    creditCompensation: null,
  };
}

function toDisputeResult(
  purchase: {
    readonly id: string;
    readonly provider: 'stripe' | 'polar';
    readonly providerOrderId: string;
    readonly kind: 'lifetime' | 'credit_pack';
    readonly status: 'paid' | 'refunded' | 'partially_refunded' | 'disputed';
  },
  changed: boolean,
  outcome: PurchaseDisputeOutcome,
): PurchaseDisputeResult {
  return {
    purchaseId: purchase.id,
    provider: purchase.provider,
    providerOrderId: purchase.providerOrderId,
    kind: purchase.kind,
    status: purchase.status,
    changed,
    outcome,
    creditCompensation: null,
  };
}
