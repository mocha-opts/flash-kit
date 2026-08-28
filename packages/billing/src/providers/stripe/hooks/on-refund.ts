import type Stripe from 'stripe';

import {
  partialRefundPurchaseInTransaction,
  refundPurchaseInTransaction,
} from '#refunds/purchase-status';
import type {
  StripeRefundDisputeApplyResolution,
  StripeRefundResolution,
} from './refund-dispute/contract';
import { processStripeRefundDisputeEvent } from './refund-dispute/processor';
import { resolveStripeRefund } from './refund-dispute/resolver';

const stripeRefundEventTypes = new Set([
  'charge.refund.updated',
  'charge.refunded',
  'refund.created',
  'refund.failed',
  'refund.updated',
]);

const refundFailure = {
  code: 'refund_processing_failed',
  message: 'Stripe refund processing failed.',
} as const;

export function isStripeRefundEventType(eventType: string): boolean {
  return stripeRefundEventTypes.has(eventType);
}

/**
 * Handles successful Stripe refunds. Partial refunds only mark the Purchase;
 * a later full refund appends the one compensating Credit transaction. Pending
 * and failed deliveries are recorded as ignored until a later provider event
 * confirms success.
 */
export async function handleStripeRefundEvent(event: Stripe.Event): Promise<void> {
  if (!isStripeRefundEventType(event.type)) {
    return;
  }

  await processStripeRefundDisputeEvent(
    event,
    async (): Promise<StripeRefundResolution> => await resolveStripeRefund(event),
    async (transaction, resolution: StripeRefundDisputeApplyResolution) => {
      if (resolution.operation !== 'refund') {
        throw new Error('Stripe refund resolver returned a dispute operation.');
      }

      const input = {
        userId: resolution.userId,
        provider: 'stripe' as const,
        providerOrderId: resolution.providerOrderId,
      };

      if (resolution.status === 'partially_refunded') {
        await partialRefundPurchaseInTransaction(transaction, input);
        return;
      }

      await refundPurchaseInTransaction(transaction, input);
    },
    refundFailure,
  );
}
