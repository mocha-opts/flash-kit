import type Stripe from 'stripe';

import { disputePurchaseInTransaction } from '#refunds/purchase-status';
import type {
  StripeDisputeResolution,
  StripeRefundDisputeApplyResolution,
} from './refund-dispute/contract';
import { processStripeRefundDisputeEvent } from './refund-dispute/processor';
import { resolveStripeDispute } from './refund-dispute/resolver';

const stripeDisputeEventTypes = new Set([
  'charge.dispute.closed',
  'charge.dispute.created',
  'charge.dispute.funds_reinstated',
  'charge.dispute.funds_withdrawn',
  'charge.dispute.updated',
]);

const disputeFailure = {
  code: 'dispute_processing_failed',
  message: 'Stripe dispute processing failed.',
} as const;

export function isStripeDisputeEventType(eventType: string): boolean {
  return stripeDisputeEventTypes.has(eventType);
}

/**
 * Handles Stripe dispute lifecycle events. Active/lost outcomes revoke the
 * one-time Purchase; won/funds-reinstated restores a disputed Purchase only
 * through the provider-neutral core seam. Subscription resolutions remain
 * ignored locally because their live Stripe status is authoritative.
 */
export async function handleStripeDisputeEvent(event: Stripe.Event): Promise<void> {
  if (!isStripeDisputeEventType(event.type)) {
    return;
  }

  await processStripeRefundDisputeEvent(
    event,
    async (): Promise<StripeDisputeResolution> => await resolveStripeDispute(event),
    async (transaction, resolution: StripeRefundDisputeApplyResolution) => {
      if (resolution.operation !== 'dispute') {
        throw new Error('Stripe dispute resolver returned a refund operation.');
      }

      await disputePurchaseInTransaction(transaction, {
        userId: resolution.userId,
        provider: 'stripe',
        providerOrderId: resolution.providerOrderId,
        outcome: resolution.outcome,
      });
    },
    disputeFailure,
  );
}
