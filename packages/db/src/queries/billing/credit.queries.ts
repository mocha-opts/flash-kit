import 'server-only';

import { and, asc, desc, eq, gt, gte, sql } from 'drizzle-orm';

import { type DatabaseClient, type DatabaseTransaction, db } from '#db/client/index';
import { billingPurchase, creditAccount, creditTransaction } from '#db/schema/index';
import type { BillingPurchaseRecord } from './purchase.queries';

const MAX_PAGE_SIZE = 100;

export type CreditAccountRecord = typeof creditAccount.$inferSelect;
export type CreditTransactionRecord = typeof creditTransaction.$inferSelect;

export type CreditTransactionWithPurchase = {
  readonly transaction: CreditTransactionRecord;
  readonly purchase: BillingPurchaseRecord | null;
};

/** User/Purchase scope for reading the immutable historical purchase grant. */
export type CreditPurchaseGrantInput = {
  readonly userId: string;
  readonly purchaseId: string;
};

export type CreditTransactionsPageRecord = {
  readonly items: CreditTransactionWithPurchase[];
  readonly hasNext: boolean;
};

export type ListCreditTransactionsForUserInput = {
  readonly userId: string;
  readonly page: number;
  readonly limit: number;
};

export type CreditTransactionReferenceInput = {
  readonly userId: string;
  readonly referenceType: string;
  readonly referenceId: string;
  readonly type: CreditTransactionRecord['type'];
};

export type InsertCreditTransactionInput = CreditTransactionReferenceInput & {
  readonly amount: number;
  readonly balanceAfter: number;
  readonly description: string;
  readonly purchaseId?: string | null;
  readonly actorUserId?: string | null;
};

export type SetCreditBalanceInput = {
  readonly userId: string;
  readonly balance: number;
};

export type DecrementCreditBalanceInput = {
  readonly userId: string;
  readonly amount: number;
};

/** Returns the current integer balance, using zero for a user without an account. */
export async function getCreditBalanceForUser(
  userId: string,
  database: DatabaseClient = db,
): Promise<number> {
  const rows = await database
    .select({ balance: creditAccount.balance })
    .from(creditAccount)
    .where(eq(creditAccount.userId, userId))
    .limit(1);

  return rows[0]?.balance ?? 0;
}

/**
 * Lists a user's immutable ledger entries with a provider-neutral purchase
 * relation and 1-based offset pagination.
 */
export async function listCreditTransactionsForUser(
  { userId, page, limit }: ListCreditTransactionsForUserInput,
  database: DatabaseClient = db,
): Promise<CreditTransactionsPageRecord> {
  const pagination = normalizePagination(page, limit);
  const rows = await database
    .select({
      transaction: creditTransaction,
      purchase: billingPurchase,
    })
    .from(creditTransaction)
    .leftJoin(
      billingPurchase,
      and(eq(creditTransaction.purchaseId, billingPurchase.id), eq(billingPurchase.userId, userId)),
    )
    .where(eq(creditTransaction.userId, userId))
    .orderBy(desc(creditTransaction.createdAt), desc(creditTransaction.id))
    .limit(pagination.limit + 1)
    .offset(pagination.offset);

  const hasNext = rows.length > pagination.limit;

  return {
    items: rows.slice(0, pagination.limit).map(({ transaction, purchase }) => ({
      transaction,
      purchase,
    })),
    hasNext,
  };
}

/** Ensures a user's balance row exists before it is locked by Billing. */
export async function ensureCreditAccountForUser(
  transaction: DatabaseTransaction,
  userId: string,
): Promise<void> {
  await transaction
    .insert(creditAccount)
    .values({ userId })
    .onConflictDoNothing({ target: creditAccount.userId });
}

/** Locks and returns a user-owned balance row inside the caller's transaction. */
export async function lockCreditAccountForUser(
  transaction: DatabaseTransaction,
  userId: string,
): Promise<CreditAccountRecord | null> {
  const rows = await transaction
    .select()
    .from(creditAccount)
    .where(eq(creditAccount.userId, userId))
    .for('update')
    .limit(1);

  return rows[0] ?? null;
}

/** Returns a paid Credit Pack purchase only when it belongs to the trusted user. */
export async function findPaidCreditPackPurchaseForUser(
  transaction: DatabaseTransaction,
  input: { readonly userId: string; readonly purchaseId: string },
): Promise<BillingPurchaseRecord | null> {
  const rows = await transaction
    .select()
    .from(billingPurchase)
    .where(
      and(
        eq(billingPurchase.id, input.purchaseId),
        eq(billingPurchase.userId, input.userId),
        eq(billingPurchase.kind, 'credit_pack'),
        eq(billingPurchase.status, 'paid'),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Finds one immutable ledger entry by its user-scoped idempotency reference. */
export async function findCreditTransactionByReferenceForUser(
  transaction: DatabaseTransaction,
  input: CreditTransactionReferenceInput,
): Promise<CreditTransactionRecord | null> {
  const rows = await transaction
    .select()
    .from(creditTransaction)
    .where(
      and(
        eq(creditTransaction.userId, input.userId),
        eq(creditTransaction.referenceType, input.referenceType),
        eq(creditTransaction.referenceId, input.referenceId),
        eq(creditTransaction.type, input.type),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Returns the historical positive grant for one Credit Pack Purchase. The
 * Purchase grant is the accounting source of truth for a later refund; the
 * current Catalog must never be consulted to derive the refund amount.
 */
export async function findCreditPurchaseGrantForUser(
  transaction: DatabaseTransaction,
  input: CreditPurchaseGrantInput,
): Promise<CreditTransactionRecord | null> {
  const rows = await transaction
    .select()
    .from(creditTransaction)
    .where(
      and(
        eq(creditTransaction.userId, input.userId),
        eq(creditTransaction.purchaseId, input.purchaseId),
        eq(creditTransaction.type, 'purchase'),
        eq(creditTransaction.referenceType, 'purchase'),
        eq(creditTransaction.referenceId, input.purchaseId),
        gt(creditTransaction.amount, 0),
      ),
    )
    .orderBy(asc(creditTransaction.createdAt), asc(creditTransaction.id))
    .limit(1);

  return rows[0] ?? null;
}

/** Sets a user's balance and returns the updated row. */
export async function setCreditBalanceForUser(
  transaction: DatabaseTransaction,
  input: SetCreditBalanceInput,
): Promise<CreditAccountRecord | null> {
  const rows = await transaction
    .update(creditAccount)
    .set({ balance: input.balance, updatedAt: new Date() })
    .where(eq(creditAccount.userId, input.userId))
    .returning();

  return rows[0] ?? null;
}

/**
 * Atomically deducts a positive amount only when the trusted user's current
 * balance can cover it. A null result means that no qualifying user row exists.
 */
export async function decrementCreditBalanceIfSufficientForUser(
  transaction: DatabaseTransaction,
  input: DecrementCreditBalanceInput,
): Promise<CreditAccountRecord | null> {
  const rows = await transaction
    .update(creditAccount)
    .set({
      balance: sql<number>`${creditAccount.balance} - ${input.amount}`,
      updatedAt: new Date(),
    })
    .where(and(eq(creditAccount.userId, input.userId), gte(creditAccount.balance, input.amount)))
    .returning();

  return rows[0] ?? null;
}

/** Appends one immutable credit ledger entry. */
export async function insertCreditTransaction(
  transaction: DatabaseTransaction,
  input: InsertCreditTransactionInput,
): Promise<CreditTransactionRecord | null> {
  const rows = await transaction
    .insert(creditTransaction)
    .values({
      ...input,
      purchaseId: input.purchaseId ?? null,
      actorUserId: input.actorUserId ?? null,
    })
    .returning();

  return rows[0] ?? null;
}

function normalizePagination(
  page: number,
  limit: number,
): {
  readonly limit: number;
  readonly offset: number;
} {
  if (!Number.isSafeInteger(page) || page < 1) {
    throw new RangeError('Credit transaction page must be a positive integer.');
  }

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
    throw new RangeError('Credit transaction limit must be an integer from 1 to 100.');
  }

  const offset = (page - 1) * limit;

  if (!Number.isSafeInteger(offset)) {
    throw new RangeError('Credit transaction pagination offset is too large.');
  }

  return { limit, offset };
}
