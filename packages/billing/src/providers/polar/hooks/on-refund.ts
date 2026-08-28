import 'server-only';

import type { WebhookOrderRefundedPayload } from '@polar-sh/sdk/models/components/webhookorderrefundedpayload.js';
import type { WebhookRefundCreatedPayload } from '@polar-sh/sdk/models/components/webhookrefundcreatedpayload.js';
import type { WebhookRefundUpdatedPayload } from '@polar-sh/sdk/models/components/webhookrefundupdatedpayload.js';

import type {
  PolarRefundEventHandlers,
  PolarRefundEventProcessor,
  PolarRefundEventProcessorInput,
} from './refund/contracts';
import { createOrderIdentity, createRefundIdentity } from './refund/identity';
import { resolvePolarOrderRefund, resolvePolarRefund } from './refund/resolve-refund';

const refundFailure = {
  code: 'refund_processing_failed',
  message: 'Polar refund processing failed.',
} as const;

const disputeFailure = {
  code: 'dispute_processing_failed',
  message: 'Polar dispute processing failed.',
} as const;

export type {
  PolarDisputeStatus,
  PolarRefundEventHandlers,
  PolarRefundEventIdentity,
  PolarRefundEventProcessor,
  PolarRefundEventProcessorInput,
  PolarRefundEventResolution,
  PolarRefundEventType,
  PolarSubscriptionStatus,
} from './refund/contracts';
export { resolvePolarOrderRefund, resolvePolarRefund } from './refund/resolve-refund';

/**
 * Binds Polar's Better Auth webhook callbacks to the provider-neutral core
 * processor. Better Auth has already verified the Standard Webhooks
 * signature before these callbacks run.
 */
export function createPolarRefundHandlers(
  processRefundEvent: PolarRefundEventProcessor,
): PolarRefundEventHandlers {
  return {
    onOrderRefunded: (payload) => handlePolarOrderRefunded(payload, processRefundEvent),
    onRefundCreated: (payload) => handlePolarRefundCreated(payload, processRefundEvent),
    onRefundUpdated: (payload) => handlePolarRefundUpdated(payload, processRefundEvent),
  };
}

export async function handlePolarOrderRefunded(
  payload: WebhookOrderRefundedPayload,
  processRefundEvent: PolarRefundEventProcessor,
): Promise<void> {
  const order = payload.data;
  const identity = createOrderIdentity(order);

  await processRefundEvent({
    identity,
    resolve: async () => resolvePolarOrderRefund(payload),
    failure: refundFailure,
  });
}

export async function handlePolarRefundCreated(
  payload: WebhookRefundCreatedPayload,
  processRefundEvent: PolarRefundEventProcessor,
): Promise<void> {
  await handlePolarRefund(payload, 'refund.created', processRefundEvent);
}

export async function handlePolarRefundUpdated(
  payload: WebhookRefundUpdatedPayload,
  processRefundEvent: PolarRefundEventProcessor,
): Promise<void> {
  await handlePolarRefund(payload, 'refund.updated', processRefundEvent);
}

async function handlePolarRefund(
  payload: WebhookRefundCreatedPayload | WebhookRefundUpdatedPayload,
  eventType: 'refund.created' | 'refund.updated',
  processRefundEvent: PolarRefundEventProcessor,
): Promise<void> {
  const refund = payload.data;
  const input: PolarRefundEventProcessorInput = {
    identity: createRefundIdentity(refund, eventType),
    resolve: async () => resolvePolarRefund(payload),
    failure: refund.dispute ? disputeFailure : refundFailure,
  };

  await processRefundEvent(input);
}
