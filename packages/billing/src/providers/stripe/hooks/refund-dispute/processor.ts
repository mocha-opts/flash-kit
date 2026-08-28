import 'server-only';

import type { UpsertBillingEventInput } from '@repo/db/queries/billing';
import type Stripe from 'stripe';

import { processBillingEvent } from '#internal/process-billing-event';
import type { StripeRefundDisputeApply, StripeRefundDisputeResolution } from './contract';
import { StripeRefundDisputeValidationError } from './validation';

/**
 * Adapts a verified Stripe refund/dispute callback to the shared Billing Event
 * lifecycle. Provider facts resolve before the short database transaction.
 */
export async function processStripeRefundDisputeEvent(
  event: Stripe.Event,
  resolve: () => Promise<StripeRefundDisputeResolution>,
  apply: StripeRefundDisputeApply,
  failure: { readonly code: string; readonly message: string },
): Promise<void> {
  const identity = toEventIdentity(event);

  await processBillingEvent({
    identity,
    resolve,
    failure,
    apply: async (transaction, resolution) => {
      if (resolution.kind === 'ignored' || resolution.kind === 'subscription') {
        return 'ignored';
      }

      const purchaseContext = {
        kind: 'purchase' as const,
        userId: resolution.userId,
        providerOrderId: resolution.providerOrderId,
        purchaseKind: resolution.purchaseKind,
        customerId: resolution.customerId,
        referenceId: resolution.operation === 'refund' ? resolution.refundId : resolution.disputeId,
        amount: resolution.amount,
        currency: resolution.currency,
      };

      if (resolution.operation === 'refund') {
        await apply(transaction, {
          ...purchaseContext,
          operation: 'refund',
          status: resolution.status,
        });
      } else {
        await apply(transaction, {
          ...purchaseContext,
          operation: 'dispute',
          outcome: resolution.outcome,
        });
      }

      return 'processed';
    },
    createProcessingError: (cause) =>
      new StripeRefundDisputeProcessingError(failure.message, { cause }),
  });
}

function toEventIdentity(event: Stripe.Event): UpsertBillingEventInput {
  if (!event.id || !/^evt_[A-Za-z0-9]+$/u.test(event.id)) {
    throw new StripeRefundDisputeValidationError('Stripe event has an invalid event id.');
  }

  if (!event.type || event.created <= 0) {
    throw new StripeRefundDisputeValidationError('Stripe event has invalid event metadata.');
  }

  return {
    provider: 'stripe',
    providerEventId: event.id,
    eventType: event.type,
    receivedAt: new Date(),
  };
}

class StripeRefundDisputeProcessingError extends Error {
  override readonly name = 'StripeRefundDisputeProcessingError';
}
