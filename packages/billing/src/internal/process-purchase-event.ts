import { db, withTransaction } from '@repo/db/client';
import {
  claimBillingEvent,
  type InsertBillingPurchaseInput,
  insertBillingPurchase,
  markBillingEventFailed,
  markBillingEventIgnored,
  markBillingEventProcessed,
  type UpsertBillingEventInput,
  upsertBillingEvent,
} from '@repo/db/queries/billing';
import { grantCreditsForPurchase } from '#credits/grant-purchase-credits';

/** Result of resolving a verified provider event into a local purchase fact. */
export type PurchaseEventResolution =
  | { readonly kind: 'ignored' }
  | {
      readonly kind: 'paid';
      readonly purchase: InsertBillingPurchaseInput;
      readonly creditGrant?: {
        readonly amount: number;
        readonly description: string;
      };
    };

/** Fixed, non-sensitive failure details owned by the provider adapter. */
export type PurchaseEventFailure = {
  readonly code: string;
  readonly message: string;
};

export type ProcessPurchaseEventInput = {
  readonly identity: UpsertBillingEventInput;
  readonly resolve: () => Promise<PurchaseEventResolution>;
  readonly failure: PurchaseEventFailure;
};

/**
 * Runs the provider-neutral purchase ledger workflow.
 *
 * Event claiming and purchase insertion share one transaction. Provider facts
 * are resolved before that transaction so the database lock stays short. Any
 * failure is recorded with adapter-owned safe text and rethrown with the same
 * safe message so the official provider adapter can return a non-2xx response.
 */
export async function processPurchaseEvent(input: ProcessPurchaseEventInput): Promise<void> {
  try {
    const event = await upsertBillingEvent(db, input.identity);

    if (isTerminalEvent(event.status)) {
      return;
    }

    const resolution = await input.resolve();

    await withTransaction(db, async (transaction) => {
      const claim = await claimBillingEvent(transaction, input.identity);

      if (!claim.shouldProcess) {
        return;
      }

      if (resolution.kind === 'ignored') {
        await markBillingEventIgnored(transaction, claim.event.id);
        return;
      }

      const { purchase } = await insertBillingPurchase(transaction, resolution.purchase);

      if (resolution.creditGrant) {
        await grantCreditsForPurchase(transaction, {
          userId: resolution.purchase.userId,
          purchaseId: purchase.id,
          amount: resolution.creditGrant.amount,
          description: resolution.creditGrant.description,
        });
      }

      await markBillingEventProcessed(transaction, claim.event.id);
    });
  } catch (cause) {
    await markFailure(input.identity, input.failure);
    throw new PurchaseEventProcessingError(input.failure.message, { cause });
  }
}

function isTerminalEvent(status: string): boolean {
  return status === 'processed' || status === 'ignored';
}

async function markFailure(
  identity: UpsertBillingEventInput,
  failure: PurchaseEventFailure,
): Promise<void> {
  try {
    await markBillingEventFailed(db, {
      provider: identity.provider,
      providerEventId: identity.providerEventId,
      errorCode: failure.code,
      errorMessage: failure.message,
    });
  } catch {
    // Preserve the fixed processing error so the provider can redeliver.
  }
}

class PurchaseEventProcessingError extends Error {
  override readonly name = 'PurchaseEventProcessingError';
}
