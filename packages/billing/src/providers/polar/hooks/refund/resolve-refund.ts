import 'server-only';

import type { WebhookOrderRefundedPayload } from '@polar-sh/sdk/models/components/webhookorderrefundedpayload.js';
import type { WebhookRefundCreatedPayload } from '@polar-sh/sdk/models/components/webhookrefundcreatedpayload.js';
import type { WebhookRefundUpdatedPayload } from '@polar-sh/sdk/models/components/webhookrefundupdatedpayload.js';

import { createPolarClient } from '#providers/polar/polar-client';

import type { PolarRefundEventResolution, PolarSubscriptionStatus } from './contracts';
import {
  createDisputeReference,
  createOrderRefundReference,
  createRefundReference,
} from './identity';
import {
  PolarRefundValidationError,
  requireOneTimeOrderMetadata,
  toProviderNeutralDisputeStatus,
  validateDispute,
  validateOrderRefund,
  validateRefund,
  validateRefundOrderAssociation,
  validateSubscriptionAssociation,
} from './validation';

const noRetries = { retries: { strategy: 'none' as const } };

/** Resolves a verified `order.refunded` payload without touching local state. */
export async function resolvePolarOrderRefund(
  payload: WebhookOrderRefundedPayload,
): Promise<PolarRefundEventResolution> {
  const order = payload.data;
  const refundStatus = validateOrderRefund(order, payload.timestamp);

  const oneTime = order.subscriptionId === null;
  const userId = oneTime ? requireOneTimeOrderMetadata(order) : null;
  const subscriptionStatus = oneTime ? null : await resolveSubscriptionStatusForOrder(order);

  return {
    kind: 'refund',
    provider: 'polar',
    userId,
    providerOrderId: order.id,
    providerRefundId: null,
    providerSubscriptionId: order.subscriptionId,
    subscriptionStatus,
    status: refundStatus,
    amount: order.refundedAmount,
    taxAmount: order.refundedTaxAmount,
    currency: order.currency,
    referenceId: createOrderRefundReference(order),
    occurredAt: payload.timestamp,
  };
}

/** Resolves a verified `refund.created` or `refund.updated` payload. */
export async function resolvePolarRefund(
  payload: WebhookRefundCreatedPayload | WebhookRefundUpdatedPayload,
): Promise<PolarRefundEventResolution> {
  const refund = payload.data;
  validateRefund(refund, payload.timestamp);

  if (refund.dispute) {
    validateDispute(refund.dispute, refund);

    if (refund.dispute.status === 'prevented') {
      if (refund.status !== 'succeeded') {
        return { kind: 'ignored', reason: 'dispute_prevented_without_refund' };
      }

      return createRefundResolution(
        refund,
        payload.timestamp,
        await resolveRefundContext(refund, payload.timestamp),
      );
    }

    const context = await resolveRefundContext(refund, payload.timestamp);

    return {
      kind: 'dispute',
      provider: 'polar',
      userId: context.userId,
      providerOrderId: refund.orderId,
      providerRefundId: refund.id,
      providerSubscriptionId: refund.subscriptionId,
      subscriptionStatus: context.subscriptionStatus,
      disputeId: refund.dispute.id,
      status: toProviderNeutralDisputeStatus(refund.dispute.status),
      amount: refund.dispute.amount,
      taxAmount: refund.dispute.taxAmount,
      currency: refund.dispute.currency,
      referenceId: createDisputeReference(refund),
      occurredAt: payload.timestamp,
    };
  }

  if (refund.status !== 'succeeded') {
    return { kind: 'ignored', reason: 'refund_not_succeeded' };
  }

  return createRefundResolution(
    refund,
    payload.timestamp,
    await resolveRefundContext(refund, payload.timestamp),
  );
}

function createRefundResolution(
  refund: WebhookRefundCreatedPayload['data'],
  occurredAt: Date,
  context: PolarRefundContext,
): Extract<PolarRefundEventResolution, { readonly kind: 'refund' }> {
  return {
    kind: 'refund',
    provider: 'polar',
    userId: context.userId,
    providerOrderId: refund.orderId,
    providerRefundId: refund.id,
    providerSubscriptionId: refund.subscriptionId,
    subscriptionStatus: context.subscriptionStatus,
    // A Refund resource carries only one refund amount. The freshly retrieved
    // Order owns the cumulative full/partial decision.
    status: context.refundStatus,
    amount: refund.amount,
    taxAmount: refund.taxAmount,
    currency: refund.currency,
    referenceId: createRefundReference(refund),
    occurredAt,
  };
}

type PolarRefundContext = {
  readonly userId: string | null;
  readonly subscriptionStatus: PolarSubscriptionStatus | null;
  readonly refundStatus: 'refunded' | 'partially_refunded';
};

async function resolveRefundContext(
  refund: WebhookRefundCreatedPayload['data'],
  eventTimestamp: Date,
): Promise<PolarRefundContext> {
  const client = createPolarClient();
  const order = await client.orders.get({ id: refund.orderId }, noRetries);

  const refundStatus = validateOrderRefund(order, eventTimestamp);
  validateRefundOrderAssociation(refund, order);

  if (refund.subscriptionId === null) {
    return {
      userId: requireOneTimeOrderMetadata(order),
      subscriptionStatus: null,
      refundStatus,
    };
  }

  const subscription = await client.subscriptions.get({ id: refund.subscriptionId }, noRetries);

  return {
    userId: null,
    subscriptionStatus: validateSubscriptionAssociation(subscription, order, {
      customerId: refund.customerId,
      orderId: refund.orderId,
      subscriptionId: refund.subscriptionId,
      currency: refund.currency,
    }),
    refundStatus,
  };
}

async function resolveSubscriptionStatusForOrder(
  order: WebhookOrderRefundedPayload['data'],
): Promise<PolarSubscriptionStatus> {
  if (!order.subscriptionId) {
    throw new PolarRefundValidationError();
  }

  const client = createPolarClient();
  const subscription = await client.subscriptions.get({ id: order.subscriptionId }, noRetries);

  return validateSubscriptionAssociation(subscription, order, {
    customerId: order.customer.id,
    orderId: order.id,
    subscriptionId: order.subscriptionId,
    currency: order.currency,
  });
}
