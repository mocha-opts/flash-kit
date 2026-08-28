import type { WebhookOrderRefundedPayload } from '@polar-sh/sdk/models/components/webhookorderrefundedpayload.js';
import type { WebhookRefundCreatedPayload } from '@polar-sh/sdk/models/components/webhookrefundcreatedpayload.js';

import type { PolarRefundEventIdentity } from './contracts';

export function createOrderIdentity(
  order: WebhookOrderRefundedPayload['data'],
): PolarRefundEventIdentity {
  return {
    provider: 'polar',
    providerEventId: `order.refunded:${createOrderRefundReference(order)}`,
    eventType: 'order.refunded',
  };
}

export function createRefundIdentity(
  refund: WebhookRefundCreatedPayload['data'],
  eventType: 'refund.created' | 'refund.updated',
): PolarRefundEventIdentity {
  const version = refund.modifiedAt ?? refund.createdAt;
  const disputeVersion = refund.dispute
    ? `${refund.dispute.id}:${refund.dispute.status}:${(refund.dispute.modifiedAt ?? refund.dispute.createdAt).toISOString()}`
    : 'none';

  return {
    provider: 'polar',
    // Polar's callback payload does not expose the webhook id. Include the
    // semantic version so pending→succeeded and dispute status transitions
    // can each be processed while exact redeliveries remain idempotent.
    providerEventId: `refund:${refund.id}:${refund.status}:${version.toISOString()}:${disputeVersion}`,
    eventType,
  };
}

export function createOrderRefundReference(order: WebhookOrderRefundedPayload['data']): string {
  return `${order.id}:${order.status}:${order.refundedAmount}:${order.refundedTaxAmount}`;
}

export function createRefundReference(refund: WebhookRefundCreatedPayload['data']): string {
  return `refund:${refund.id}`;
}

export function createDisputeReference(refund: WebhookRefundCreatedPayload['data']): string {
  return `dispute:${refund.dispute?.id ?? refund.id}`;
}
