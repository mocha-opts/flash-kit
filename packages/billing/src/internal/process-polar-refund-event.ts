import 'server-only';

import { processBillingEvent } from '#internal/process-billing-event';
import type {
  PolarRefundEventProcessorInput,
  PolarRefundEventResolution,
} from '#providers/polar/hooks/on-refund';
import {
  disputePurchaseInTransaction,
  partialRefundPurchaseInTransaction,
  refundPurchaseInTransaction,
} from '#refunds/purchase-status';

/**
 * Applies one verified Polar refund/dispute delivery through the shared local
 * Purchase and Credit seams. Provider lookups finish before the short database
 * transaction; failures remain non-terminal so Polar can redeliver them.
 */
export async function processPolarRefundEvent(
  input: PolarRefundEventProcessorInput,
): Promise<void> {
  await processBillingEvent({
    identity: input.identity,
    resolve: input.resolve,
    failure: input.failure,
    apply: async (transaction, resolution) => {
      if (resolution.kind === 'ignored' || isSubscriptionResolution(resolution)) {
        return 'ignored';
      }

      if (
        resolution.provider !== 'polar' ||
        resolution.userId === null ||
        resolution.subscriptionStatus !== null
      ) {
        throw new PolarRefundEventValidationError();
      }

      const purchase = {
        userId: resolution.userId,
        provider: 'polar' as const,
        providerOrderId: resolution.providerOrderId,
      };

      if (resolution.kind === 'dispute') {
        await disputePurchaseInTransaction(transaction, {
          ...purchase,
          outcome: resolution.status,
        });
      } else if (resolution.status === 'partially_refunded') {
        await partialRefundPurchaseInTransaction(transaction, purchase);
      } else {
        await refundPurchaseInTransaction(transaction, purchase);
      }

      return 'processed';
    },
    createProcessingError: (cause) =>
      new PolarRefundEventProcessingError(input.failure.message, { cause }),
  });
}

function isSubscriptionResolution(resolution: PolarRefundEventResolution): resolution is Exclude<
  PolarRefundEventResolution,
  { readonly kind: 'ignored' }
> & {
  readonly providerSubscriptionId: string;
  readonly subscriptionStatus: NonNullable<
    Exclude<PolarRefundEventResolution, { readonly kind: 'ignored' }>['subscriptionStatus']
  >;
} {
  if (resolution.kind === 'ignored' || resolution.providerSubscriptionId === null) {
    return false;
  }

  if (resolution.userId !== null || resolution.subscriptionStatus === null) {
    throw new PolarRefundEventValidationError();
  }

  return true;
}

class PolarRefundEventValidationError extends Error {
  override readonly name = 'PolarRefundEventValidationError';
}

class PolarRefundEventProcessingError extends Error {
  override readonly name = 'PolarRefundEventProcessingError';
}
