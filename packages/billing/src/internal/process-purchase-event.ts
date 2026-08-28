import {
  type InsertBillingPurchaseInput,
  insertBillingPurchase,
  type UpsertBillingEventInput,
} from '@repo/db/queries/billing';
import { grantCreditsForPurchase } from '#credits/grant-purchase-credits';
import { processBillingEvent } from '#internal/process-billing-event';

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
  await processBillingEvent({
    identity: input.identity,
    resolve: input.resolve,
    failure: input.failure,
    apply: async (transaction, resolution) => {
      if (resolution.kind === 'ignored') {
        return 'ignored';
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

      return 'processed';
    },
    createProcessingError: (cause) =>
      new PurchaseEventProcessingError(input.failure.message, { cause }),
  });
}

class PurchaseEventProcessingError extends Error {
  override readonly name = 'PurchaseEventProcessingError';
}
