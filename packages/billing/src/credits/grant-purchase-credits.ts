import type { DatabaseTransaction } from '@repo/db/client';
import {
  ensureCreditAccountForUser,
  findCreditTransactionByReferenceForUser,
  findPaidCreditPackPurchaseForUser,
  insertCreditTransaction,
  lockCreditAccountForUser,
  setCreditBalanceForUser,
} from '@repo/db/queries/billing';

const POSTGRES_INTEGER_MAX = 2_147_483_647;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_REFERENCE_ID_LENGTH = 255;

type GrantPurchaseCreditsInput = {
  readonly userId: string;
  readonly purchaseId: string;
  readonly amount: number;
  readonly description: string;
};

/**
 * Grants a paid Credit Pack inside the caller-owned purchase transaction.
 * The account lock serializes balance changes and the purchase reference makes
 * provider redelivery idempotent.
 */
export async function grantCreditsForPurchase(
  transaction: DatabaseTransaction,
  input: GrantPurchaseCreditsInput,
): Promise<void> {
  const normalized = normalizeGrantInput(input);

  await ensureCreditAccountForUser(transaction, normalized.userId);
  const account = await lockCreditAccountForUser(transaction, normalized.userId);

  if (!account) {
    throw new Error('The credit account could not be locked for the user.');
  }

  const purchase = await findPaidCreditPackPurchaseForUser(transaction, {
    userId: normalized.userId,
    purchaseId: normalized.purchaseId,
  });

  if (!purchase) {
    throw new Error('The purchase must be a paid Credit Pack owned by the user.');
  }

  const existing = await findCreditTransactionByReferenceForUser(transaction, {
    userId: normalized.userId,
    referenceType: 'purchase',
    referenceId: normalized.purchaseId,
    type: 'purchase',
  });

  if (existing) {
    assertExistingPurchaseGrant(existing, normalized);
    return;
  }

  if (normalized.amount > POSTGRES_INTEGER_MAX - account.balance) {
    throw new RangeError('The credit balance exceeds the PostgreSQL integer limit.');
  }

  const updatedAccount = await setCreditBalanceForUser(transaction, {
    userId: normalized.userId,
    balance: account.balance + normalized.amount,
  });

  if (!updatedAccount) {
    throw new Error('The credit account balance could not be updated.');
  }

  const inserted = await insertCreditTransaction(transaction, {
    userId: normalized.userId,
    type: 'purchase',
    amount: normalized.amount,
    balanceAfter: updatedAccount.balance,
    description: normalized.description,
    referenceType: 'purchase',
    referenceId: normalized.purchaseId,
    purchaseId: normalized.purchaseId,
  });

  if (!inserted) {
    throw new Error('The purchase credit transaction could not be inserted.');
  }
}

function normalizeGrantInput(input: GrantPurchaseCreditsInput): GrantPurchaseCreditsInput {
  const userId = normalizeRequiredString(input.userId, 'userId', MAX_REFERENCE_ID_LENGTH);
  const purchaseId = normalizeRequiredString(
    input.purchaseId,
    'purchaseId',
    MAX_REFERENCE_ID_LENGTH,
  );

  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new RangeError('Purchase credit amount must be a positive safe integer.');
  }

  if (input.amount > POSTGRES_INTEGER_MAX) {
    throw new RangeError('Purchase credit amount exceeds the PostgreSQL integer limit.');
  }

  const description = normalizeRequiredString(
    input.description,
    'description',
    MAX_DESCRIPTION_LENGTH,
  );

  return { userId, purchaseId, amount: input.amount, description };
}

function normalizeRequiredString(value: string, field: string, maxLength: number): string {
  const normalized = value.trim();

  if (normalized.length === 0 || normalized.length > maxLength) {
    throw new RangeError(`${field} must be non-empty and no longer than ${maxLength} characters.`);
  }

  return normalized;
}

function assertExistingPurchaseGrant(
  existing: {
    readonly userId: string;
    readonly purchaseId: string | null;
    readonly amount: number;
    readonly type: string;
    readonly referenceType: string;
    readonly referenceId: string;
  },
  input: GrantPurchaseCreditsInput,
): void {
  const matches =
    existing.userId === input.userId &&
    existing.purchaseId === input.purchaseId &&
    existing.amount === input.amount &&
    existing.type === 'purchase' &&
    existing.referenceType === 'purchase' &&
    existing.referenceId === input.purchaseId;

  if (!matches) {
    throw new Error('The existing purchase credit transaction does not match the request.');
  }
}
