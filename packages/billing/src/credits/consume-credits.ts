import type { DatabaseTransaction } from '@repo/db/client';
import {
  decrementCreditBalanceIfSufficientForUser,
  findCreditTransactionByReferenceForUser,
  insertCreditTransaction,
  lockCreditAccountForUser,
} from '@repo/db/queries/billing';
import { z } from 'zod';

import {
  type ConsumeCreditsInput,
  type ConsumeCreditsResult,
  CreditConsumptionConflictError,
  InsufficientCreditsError,
} from '#types';

const POSTGRES_INTEGER_MAX = 2_147_483_647;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_REFERENCE_TYPE_LENGTH = 100;
const MAX_REFERENCE_ID_LENGTH = 255;
const REFERENCE_TYPE_PATTERN = /^[a-z][a-z0-9_:-]*$/u;
const RESERVED_REFERENCE_TYPES = new Set(['adjustment', 'purchase', 'refund']);

/**
 * Business validation for a trusted server-side Credit consumption request.
 * Product references use stable lowercase identifiers; Billing-owned ledger
 * references are reserved for grants, refunds, and Admin adjustments.
 */
export const consumeCreditsInputSchema = z.strictObject({
  userId: z.string().uuid('Credit consumption requires a valid user id.'),
  amount: z
    .number()
    .int('Credit consumption amount must be an integer.')
    .positive('Credit consumption amount must be positive.')
    .max(POSTGRES_INTEGER_MAX, 'Credit consumption amount exceeds the PostgreSQL integer limit.'),
  description: z
    .string()
    .trim()
    .min(1, 'Credit consumption description must not be empty.')
    .max(
      MAX_DESCRIPTION_LENGTH,
      `Credit consumption description must not exceed ${MAX_DESCRIPTION_LENGTH} characters.`,
    ),
  referenceType: z
    .string()
    .trim()
    .min(1, 'Credit consumption reference type must not be empty.')
    .max(
      MAX_REFERENCE_TYPE_LENGTH,
      `Credit consumption reference type must not exceed ${MAX_REFERENCE_TYPE_LENGTH} characters.`,
    )
    .regex(
      REFERENCE_TYPE_PATTERN,
      'Credit consumption reference type must be a stable lowercase identifier.',
    )
    .refine(
      (value) => !RESERVED_REFERENCE_TYPES.has(value),
      'Credit consumption reference type is reserved by Billing.',
    ),
  referenceId: z
    .string()
    .trim()
    .min(1, 'Credit consumption reference id must not be empty.')
    .max(
      MAX_REFERENCE_ID_LENGTH,
      `Credit consumption reference id must not exceed ${MAX_REFERENCE_ID_LENGTH} characters.`,
    ),
});

/**
 * Consumes Credits inside the caller-owned transaction. The account row lock
 * serializes all balance mutations for the user, so a concurrent replay sees
 * the committed ledger entry before attempting a second conditional update.
 */
export async function consumeCreditsInTransaction(
  transaction: DatabaseTransaction,
  input: ConsumeCreditsInput,
): Promise<ConsumeCreditsResult> {
  const normalized = consumeCreditsInputSchema.parse(input);
  const account = await lockCreditAccountForUser(transaction, normalized.userId);
  const existing = await findCreditTransactionByReferenceForUser(transaction, {
    userId: normalized.userId,
    referenceType: normalized.referenceType,
    referenceId: normalized.referenceId,
    type: 'consumption',
  });

  if (existing) {
    assertExistingConsumption(existing, normalized);

    return {
      status: 'already_consumed',
      transactionId: existing.id,
      amount: normalized.amount,
      balanceAfter: existing.balanceAfter,
    };
  }

  if (!account || account.balance < normalized.amount) {
    throw new InsufficientCreditsError(normalized.amount, account?.balance ?? 0);
  }

  const updatedAccount = await decrementCreditBalanceIfSufficientForUser(transaction, {
    userId: normalized.userId,
    amount: normalized.amount,
  });

  if (!updatedAccount) {
    throw new InsufficientCreditsError(normalized.amount, account.balance);
  }

  const inserted = await insertCreditTransaction(transaction, {
    userId: normalized.userId,
    type: 'consumption',
    amount: -normalized.amount,
    balanceAfter: updatedAccount.balance,
    description: normalized.description,
    referenceType: normalized.referenceType,
    referenceId: normalized.referenceId,
  });

  if (!inserted) {
    throw new Error('The credit consumption transaction could not be inserted.');
  }

  return {
    status: 'consumed',
    transactionId: inserted.id,
    amount: normalized.amount,
    balanceAfter: inserted.balanceAfter,
  };
}

function assertExistingConsumption(
  existing: {
    readonly amount: number;
    readonly description: string;
    readonly purchaseId: string | null;
    readonly actorUserId: string | null;
  },
  input: ConsumeCreditsInput,
): void {
  const matches =
    existing.amount === -input.amount &&
    existing.description === input.description &&
    existing.purchaseId === null &&
    existing.actorUserId === null;

  if (!matches) {
    throw new CreditConsumptionConflictError();
  }
}
