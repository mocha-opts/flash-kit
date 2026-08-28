import 'server-only';

import type { DatabaseTransaction } from '@repo/db/client';
import {
  ensureCreditAccountForUser,
  findCreditPurchaseGrantForUser,
  findCreditTransactionByReferenceForUser,
  insertCreditTransaction,
  lockCreditAccountForUser,
  setCreditBalanceForUser,
} from '@repo/db/queries/billing';

import {
  BillingPurchaseCreditGrantMissingError,
  BillingPurchaseStatusConflictError,
  type CreditRefundCompensation,
} from '#types';

const POSTGRES_INTEGER_MIN = -2_147_483_648;
const POSTGRES_INTEGER_MAX = 2_147_483_647;

type CreditRefundPurchase = {
  readonly id: string;
  readonly userId: string;
};

/** Appends the one immutable compensation for a Credit Pack purchase grant. */
export async function appendCreditRefundCompensation(
  transaction: DatabaseTransaction,
  purchase: CreditRefundPurchase,
): Promise<CreditRefundCompensation> {
  const grant = await requirePurchaseGrant(transaction, purchase);
  const existing = await findRefundCompensation(transaction, purchase);

  if (existing) {
    assertExistingCreditRefund(existing, purchase, grant.amount);
    throw new BillingPurchaseStatusConflictError(
      'A Credit Pack refund compensation already exists before the Purchase is refunded.',
    );
  }

  await ensureCreditAccountForUser(transaction, purchase.userId);
  const account = await lockCreditAccountForUser(transaction, purchase.userId);

  if (!account) {
    throw new Error('The credit account could not be locked for the refund.');
  }

  const refundAmount = -grant.amount;
  const balanceAfter = account.balance + refundAmount;

  if (
    !Number.isSafeInteger(balanceAfter) ||
    balanceAfter < POSTGRES_INTEGER_MIN ||
    balanceAfter > POSTGRES_INTEGER_MAX
  ) {
    throw new RangeError('The credit refund would exceed the PostgreSQL integer limit.');
  }

  const updatedAccount = await setCreditBalanceForUser(transaction, {
    userId: purchase.userId,
    balance: balanceAfter,
  });

  if (!updatedAccount) {
    throw new Error('The credit account balance could not be updated for the refund.');
  }

  const inserted = await insertCreditTransaction(transaction, {
    userId: purchase.userId,
    type: 'refund',
    amount: refundAmount,
    balanceAfter: updatedAccount.balance,
    description: 'Credit Pack refund',
    referenceType: 'refund',
    referenceId: purchase.id,
    purchaseId: purchase.id,
  });

  if (!inserted) {
    throw new Error('The Credit Pack refund transaction could not be inserted.');
  }

  return toCompensation(inserted);
}

/** Reads and validates the compensation required by an already-refunded pack. */
export async function getRecordedCreditRefundCompensation(
  transaction: DatabaseTransaction,
  purchase: CreditRefundPurchase,
): Promise<CreditRefundCompensation> {
  const grant = await requirePurchaseGrant(transaction, purchase);
  const existing = await findRefundCompensation(transaction, purchase);

  if (!existing) {
    throw new BillingPurchaseStatusConflictError(
      'The refunded Credit Pack has no recorded refund compensation.',
    );
  }

  assertExistingCreditRefund(existing, purchase, grant.amount);

  return toCompensation(existing);
}

async function requirePurchaseGrant(
  transaction: DatabaseTransaction,
  purchase: CreditRefundPurchase,
) {
  const grant = await findCreditPurchaseGrantForUser(transaction, {
    userId: purchase.userId,
    purchaseId: purchase.id,
  });

  if (!grant) {
    throw new BillingPurchaseCreditGrantMissingError();
  }

  return grant;
}

async function findRefundCompensation(
  transaction: DatabaseTransaction,
  purchase: CreditRefundPurchase,
) {
  return await findCreditTransactionByReferenceForUser(transaction, {
    userId: purchase.userId,
    referenceType: 'refund',
    referenceId: purchase.id,
    type: 'refund',
  });
}

function assertExistingCreditRefund(
  existing: {
    readonly userId: string;
    readonly purchaseId: string | null;
    readonly type: string;
    readonly referenceType: string;
    readonly referenceId: string;
    readonly amount: number;
  },
  purchase: CreditRefundPurchase,
  grantAmount: number,
): void {
  const matches =
    existing.userId === purchase.userId &&
    existing.purchaseId === purchase.id &&
    existing.type === 'refund' &&
    existing.referenceType === 'refund' &&
    existing.referenceId === purchase.id &&
    existing.amount === -grantAmount;

  if (!matches) {
    throw new BillingPurchaseStatusConflictError(
      'The existing Credit Pack refund compensation does not match the historical grant.',
    );
  }
}

function toCompensation(transaction: {
  readonly id: string;
  readonly amount: number;
  readonly balanceAfter: number;
}): CreditRefundCompensation {
  return {
    transactionId: transaction.id,
    amount: transaction.amount,
    balanceAfter: transaction.balanceAfter,
  };
}
