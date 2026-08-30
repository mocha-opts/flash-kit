import { randomUUID } from 'node:crypto';

import type { DatabaseTransaction } from '@repo/db/client';
import {
  ensureCreditAccountForUser,
  insertCreditTransaction,
  lockCreditAccountForUser,
  setCreditBalanceForUser,
} from '@repo/db/queries/billing';
import { z } from 'zod';

import {
  type AdjustCreditsInput,
  type AdjustCreditsResult,
  CreditAdjustmentOverflowError,
} from '#types';

const POSTGRES_INTEGER_MIN = -2_147_483_648;
const POSTGRES_INTEGER_MAX = 2_147_483_647;
const MAX_REASON_LENGTH = 500;

/**
 * Trusted server contract for one Admin-authored Credit adjustment. The public
 * form has a second schema so the actor id can only come from the Admin session.
 */
export const adjustCreditsInputSchema = z.strictObject({
  userId: z.string().uuid('Credit adjustment requires a valid target user id.'),
  actorUserId: z.string().uuid('Credit adjustment requires a valid actor user id.'),
  amount: z
    .number()
    .int('Credit adjustment amount must be an integer.')
    .min(POSTGRES_INTEGER_MIN, 'Credit adjustment amount exceeds the PostgreSQL integer limit.')
    .max(POSTGRES_INTEGER_MAX, 'Credit adjustment amount exceeds the PostgreSQL integer limit.')
    .refine((value) => value !== 0, 'Credit adjustment amount must not be zero.'),
  reason: z
    .string()
    .trim()
    .min(1, 'Credit adjustment reason must not be empty.')
    .max(
      MAX_REASON_LENGTH,
      `Credit adjustment reason must not exceed ${MAX_REASON_LENGTH} characters.`,
    ),
});

/**
 * Applies one Admin adjustment inside a caller-owned database transaction.
 * Ensuring and locking the account serializes all balance mutations for the
 * target user. The ledger insert and balance write commit or roll back together.
 */
export async function adjustCreditsInTransaction(
  transaction: DatabaseTransaction,
  input: AdjustCreditsInput,
): Promise<AdjustCreditsResult> {
  const normalized = adjustCreditsInputSchema.parse(input);

  await ensureCreditAccountForUser(transaction, normalized.userId);
  const account = await lockCreditAccountForUser(transaction, normalized.userId);

  if (!account) {
    throw new Error('The credit account could not be locked for the adjustment.');
  }

  const balanceAfter = account.balance + normalized.amount;

  if (balanceAfter < POSTGRES_INTEGER_MIN || balanceAfter > POSTGRES_INTEGER_MAX) {
    throw new CreditAdjustmentOverflowError();
  }

  const updatedAccount = await setCreditBalanceForUser(transaction, {
    userId: normalized.userId,
    balance: balanceAfter,
  });

  if (!updatedAccount) {
    throw new Error('The credit account balance could not be updated for the adjustment.');
  }

  const referenceId = randomUUID();
  const inserted = await insertCreditTransaction(transaction, {
    userId: normalized.userId,
    actorUserId: normalized.actorUserId,
    amount: normalized.amount,
    balanceAfter: updatedAccount.balance,
    description: normalized.reason,
    referenceId,
    referenceType: 'adjustment',
    type: 'adjustment',
  });

  if (!inserted) {
    throw new Error('The credit adjustment transaction could not be inserted.');
  }

  return {
    transactionId: inserted.id,
    userId: normalized.userId,
    actorUserId: normalized.actorUserId,
    amount: inserted.amount,
    balanceAfter: inserted.balanceAfter,
    reason: inserted.description,
    referenceId: inserted.referenceId,
  };
}
