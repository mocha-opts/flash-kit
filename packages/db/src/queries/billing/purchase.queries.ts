import 'server-only';

import { and, desc, eq } from 'drizzle-orm';

import { type DatabaseClient, type DatabaseTransaction, db } from '#db/client/index';
import {
  type BillingProvider,
  type BillingPurchaseKind,
  type BillingPurchaseStatus,
  billingPurchase,
} from '#db/schema/index';

export type BillingPurchaseRecord = typeof billingPurchase.$inferSelect;

/** User-scoped provider order identity used to prevent cross-user mutation. */
export type BillingPurchaseUserOrderInput = {
  readonly userId: string;
  readonly provider: BillingProvider;
  readonly providerOrderId: string;
};

/** One guarded status transition performed while the purchase row is locked. */
export type TransitionBillingPurchaseStatusInput = {
  readonly userId: string;
  readonly provider: BillingProvider;
  readonly providerOrderId: string;
  readonly purchaseId: string;
  readonly currentStatus: BillingPurchaseStatus;
  readonly nextStatus: BillingPurchaseStatus;
};

/** Input for inserting one provider-confirmed Lifetime or Credit Pack order. */
export type InsertBillingPurchaseInput = {
  readonly userId: string;
  readonly provider: BillingProvider;
  readonly providerOrderId: string;
  readonly providerCheckoutId?: string | null;
  readonly productId: string;
  readonly planId: string;
  readonly kind: BillingPurchaseKind;
  readonly status: BillingPurchaseStatus;
  readonly amount: number;
  readonly currency: string;
  readonly purchasedAt?: Date;
};

/** Result of a unique purchase insert; duplicates return the existing row. */
export type InsertBillingPurchaseResult = {
  readonly purchase: BillingPurchaseRecord;
  readonly inserted: boolean;
};

/**
 * Locks one Purchase in the trusted User/provider/order scope. A mismatched
 * User is intentionally indistinguishable from a missing order.
 */
export async function lockBillingPurchaseForUserByProviderOrder(
  transaction: DatabaseTransaction,
  input: BillingPurchaseUserOrderInput,
): Promise<BillingPurchaseRecord | null> {
  const rows = await transaction
    .select()
    .from(billingPurchase)
    .where(
      and(
        eq(billingPurchase.userId, input.userId),
        eq(billingPurchase.provider, input.provider),
        eq(billingPurchase.providerOrderId, input.providerOrderId),
      ),
    )
    .for('update')
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Atomically changes a Purchase status only when its expected status still
 * matches. Callers normally lock the row first, then use this guard to make a
 * stale transition a harmless null result instead of overwriting a newer one.
 */
export async function transitionBillingPurchaseStatus(
  transaction: DatabaseTransaction,
  input: TransitionBillingPurchaseStatusInput,
): Promise<BillingPurchaseRecord | null> {
  const rows = await transaction
    .update(billingPurchase)
    .set({ status: input.nextStatus, updatedAt: new Date() })
    .where(
      and(
        eq(billingPurchase.userId, input.userId),
        eq(billingPurchase.id, input.purchaseId),
        eq(billingPurchase.status, input.currentStatus),
        eq(billingPurchase.provider, input.provider),
        eq(billingPurchase.providerOrderId, input.providerOrderId),
      ),
    )
    .returning();

  return rows[0] ?? null;
}

/**
 * Inserts a provider order exactly once inside the caller's transaction.
 *
 * The unique provider/order index is the concurrency boundary. A conflict is
 * returned as `inserted: false` so Billing can avoid granting the same order
 * twice and can separately validate any provider-data mismatch.
 */
export async function insertBillingPurchase(
  transaction: DatabaseTransaction,
  input: InsertBillingPurchaseInput,
): Promise<InsertBillingPurchaseResult> {
  const currency = input.currency.trim().toLowerCase();
  const insertedRows = await transaction
    .insert(billingPurchase)
    .values({
      userId: input.userId,
      provider: input.provider,
      providerOrderId: input.providerOrderId,
      providerCheckoutId: input.providerCheckoutId ?? null,
      productId: input.productId,
      planId: input.planId,
      kind: input.kind,
      status: input.status,
      amount: input.amount,
      currency,
      purchasedAt: input.purchasedAt ?? new Date(),
    })
    .onConflictDoNothing({
      target: [billingPurchase.provider, billingPurchase.providerOrderId],
    })
    .returning();

  const inserted = insertedRows[0];

  if (inserted) {
    return { purchase: inserted, inserted: true };
  }

  const existingRows = await transaction
    .select()
    .from(billingPurchase)
    .where(
      and(
        eq(billingPurchase.provider, input.provider),
        eq(billingPurchase.providerOrderId, input.providerOrderId),
      ),
    )
    .limit(1);
  const existing = existingRows[0];

  if (!existing) {
    throw new Error('The billing purchase conflict did not return an existing purchase.');
  }

  if (!matchesPurchaseIdentity(existing, input, currency)) {
    throw new Error('The provider order conflicts with an existing billing purchase.');
  }

  return { purchase: existing, inserted: false };
}

/**
 * Reads the user's newest valid Lifetime purchase. Refunded and disputed
 * purchases intentionally do not grant an Active Plan.
 */
export async function getActiveLifetimePurchaseForUser(
  userId: string,
  database: DatabaseClient = db,
): Promise<BillingPurchaseRecord | null> {
  const rows = await database
    .select()
    .from(billingPurchase)
    .where(
      and(
        eq(billingPurchase.userId, userId),
        eq(billingPurchase.kind, 'lifetime'),
        eq(billingPurchase.status, 'paid'),
      ),
    )
    .orderBy(desc(billingPurchase.purchasedAt), desc(billingPurchase.id))
    .limit(1);

  return rows[0] ?? null;
}

function matchesPurchaseIdentity(
  existing: BillingPurchaseRecord,
  input: InsertBillingPurchaseInput,
  currency: string,
): boolean {
  const checkoutMatches =
    existing.providerCheckoutId === null ||
    input.providerCheckoutId === null ||
    input.providerCheckoutId === undefined ||
    existing.providerCheckoutId === input.providerCheckoutId;

  return (
    existing.userId === input.userId &&
    existing.productId === input.productId &&
    existing.planId === input.planId &&
    existing.kind === input.kind &&
    existing.amount === input.amount &&
    existing.currency === currency &&
    checkoutMatches
  );
}
