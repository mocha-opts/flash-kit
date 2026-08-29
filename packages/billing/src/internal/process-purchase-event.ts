import {
  type InsertBillingPurchaseInput,
  insertBillingPurchase,
  type UpsertBillingEventInput,
} from '@repo/db/queries/billing';
import { grantCreditsForPurchase } from '#credits/grant-purchase-credits';
import {
  type BillingEventProcessResult,
  processBillingEvent,
} from '#internal/process-billing-event';
import type { BillingNotificationSender, PurchaseReceiptBillingNotification } from '#types';

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
      /** Optional receipt facts emitted only after the purchase transaction commits. */
      readonly notification?: PurchaseReceiptBillingNotification;
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
  readonly notificationSender?: BillingNotificationSender;
};

/**
 * Runs the provider-neutral purchase ledger workflow.
 *
 * Event claiming and purchase insertion share one transaction. Provider facts
 * are resolved before that transaction so the database lock stays short. Any
 * failure is recorded with adapter-owned safe text and rethrown with the same
 * safe message so the official provider adapter can return a non-2xx response.
 */
export async function processPurchaseEvent(
  input: ProcessPurchaseEventInput,
): Promise<BillingEventProcessResult> {
  const notificationSender = input.notificationSender;
  let receiptNotification: PurchaseReceiptBillingNotification | undefined;

  return await processBillingEvent({
    identity: input.identity,
    resolve: input.resolve,
    failure: input.failure,
    ...(notificationSender
      ? {
          notifyAfterCommit: async () => {
            if (receiptNotification) {
              await notificationSender(receiptNotification);
            }
          },
        }
      : {}),
    apply: async (transaction, resolution) => {
      if (resolution.kind === 'ignored') {
        return 'ignored';
      }

      const { purchase, inserted } = await insertBillingPurchase(transaction, resolution.purchase);

      if (resolution.creditGrant) {
        await grantCreditsForPurchase(transaction, {
          userId: resolution.purchase.userId,
          purchaseId: purchase.id,
          amount: resolution.creditGrant.amount,
          description: resolution.creditGrant.description,
        });
      }

      if (inserted && resolution.notification) {
        receiptNotification = resolution.notification;
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
