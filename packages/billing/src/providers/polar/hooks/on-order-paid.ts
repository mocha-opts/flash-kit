import type { WebhookOrderPaidPayload } from '@polar-sh/sdk/models/components/webhookorderpaidpayload.js';
import { getBillingUser } from '@repo/db/queries/billing';

import { getPolarProductId } from '#internal/catalog-pricing';
import {
  type PurchaseEventResolution,
  processPurchaseEvent,
} from '#internal/process-purchase-event';

const lifetimePlanId = 'lifetime';
const lifetimePurchaseKind = 'lifetime';
const lifetimeProcessingErrorCode = 'polar_lifetime_order_processing_failed';
const lifetimeProcessingErrorMessage = 'Polar Lifetime order processing failed.';

/**
 * Handles the official Polar `order.paid` callback after Better Auth verifies
 * its Standard Webhooks signature. All order identities are recorded with an
 * order-scoped key because this callback does not expose `webhook-id`.
 */
export async function handlePolarOrderPaid(payload: WebhookOrderPaidPayload): Promise<void> {
  const order = payload.data;

  await processPurchaseEvent({
    identity: {
      provider: 'polar',
      providerEventId: `order.paid:${order.id}`,
      eventType: 'order.paid',
    },
    resolve: async () => resolvePolarPurchase(order),
    failure: {
      code: lifetimeProcessingErrorCode,
      message: lifetimeProcessingErrorMessage,
    },
  });
}

async function resolvePolarPurchase(
  order: WebhookOrderPaidPayload['data'],
): Promise<PurchaseEventResolution> {
  const expectedProductId = getPolarProductId(lifetimePlanId);

  if (!isLifetimeCandidate(order, expectedProductId)) {
    return { kind: 'ignored' };
  }

  const userId = requireLifetimeOrder(order, expectedProductId);
  const user = await getBillingUser(userId);

  if (!user) {
    throw new PolarLifetimeValidationError();
  }

  return {
    kind: 'paid',
    purchase: {
      userId,
      provider: 'polar',
      providerOrderId: order.id,
      providerCheckoutId: order.checkoutId,
      productId: expectedProductId,
      planId: lifetimePlanId,
      kind: lifetimePurchaseKind,
      status: 'paid',
      amount: order.totalAmount,
      currency: order.currency,
      purchasedAt: order.createdAt,
    },
  };
}

function isLifetimeCandidate(
  order: WebhookOrderPaidPayload['data'],
  expectedProductId: string,
): boolean {
  return (
    order.productId === expectedProductId ||
    getMetadataString(order.metadata, 'planId') === lifetimePlanId ||
    getMetadataString(order.metadata, 'purchaseKind') === lifetimePurchaseKind
  );
}

function requireLifetimeOrder(
  order: WebhookOrderPaidPayload['data'],
  expectedProductId: string,
): string {
  const userId = getMetadataString(order.metadata, 'userId');
  const metadataProductId = getMetadataString(order.metadata, 'productId');

  if (
    !userId ||
    getMetadataString(order.metadata, 'planId') !== lifetimePlanId ||
    getMetadataString(order.metadata, 'purchaseKind') !== lifetimePurchaseKind ||
    metadataProductId !== expectedProductId ||
    order.productId !== expectedProductId ||
    order.customer.externalId !== userId ||
    order.paid !== true ||
    order.status !== 'paid' ||
    order.billingReason !== 'purchase' ||
    order.subscriptionId !== null ||
    !isNonEmptyString(order.id) ||
    !isNonEmptyString(order.checkoutId) ||
    (order.product !== null &&
      (order.product.id !== expectedProductId || order.product.isRecurring !== false)) ||
    !Number.isSafeInteger(order.totalAmount) ||
    order.totalAmount <= 0 ||
    !isLowercaseCurrency(order.currency) ||
    !isValidDate(order.createdAt)
  ) {
    throw new PolarLifetimeValidationError();
  }

  return userId;
}

function getMetadataString(
  metadata: WebhookOrderPaidPayload['data']['metadata'],
  key: string,
): string | null {
  const value = metadata[key];

  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isNonEmptyString(value: string | null): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isLowercaseCurrency(value: string): boolean {
  return /^[a-z]{3}$/u.test(value);
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

class PolarLifetimeValidationError extends Error {
  override readonly name = 'PolarLifetimeValidationError';
}
