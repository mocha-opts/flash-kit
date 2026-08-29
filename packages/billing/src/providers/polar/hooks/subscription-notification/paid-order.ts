import type { WebhookOrderPaidPayload } from '@polar-sh/sdk/models/components/webhookorderpaidpayload.js';
import { getBillingUser } from '@repo/db/queries/billing';

import { getCatalogPlan } from '#billing-config/index';
import { getPolarProductId } from '#internal/catalog-pricing';
import { processBillingEvent } from '#internal/process-billing-event';
import type { BillingNotificationOptions, SubscriptionPlan } from '#types';

import {
  PolarSubscriptionProcessingError,
  PolarSubscriptionValidationError,
  type SubscriptionNotificationResolution,
} from './contracts';
import {
  assertPriceMetadata,
  assertSubscriptionMetadata,
  getMetadataString,
  isKnownSubscriptionProduct,
  isLowercaseCurrency,
  isValidAmount,
  isValidDate,
  readBillingLocale,
  requireNonEmptyId,
} from './validation';

const subscriptionBillingReasons = new Set(['subscription_create', 'subscription_cycle']);
const processingErrorCode = 'subscription_order_processing_failed';
const processingErrorMessage = 'Subscription order processing failed.';

/** Handles the paid order for a subscription creation or renewal cycle. */
export async function handlePolarSubscriptionOrderPaid(
  payload: WebhookOrderPaidPayload,
  options: BillingNotificationOptions = {},
): Promise<void> {
  const order = payload.data;
  const sender = options.notificationSender;

  await processBillingEvent({
    identity: {
      provider: 'polar',
      providerEventId: `order.paid:${requireNonEmptyId(order.id)}`,
      eventType: 'order.paid',
    },
    resolve: async () => resolvePolarSubscriptionOrder(order),
    apply: async (_transaction, resolution) =>
      resolution.kind === 'ignored' ? 'ignored' : 'processed',
    failure: {
      code: processingErrorCode,
      message: processingErrorMessage,
    },
    ...(sender
      ? {
          notifyAfterCommit: async (resolution: SubscriptionNotificationResolution) => {
            if (resolution.kind === 'notify') {
              await sender(resolution.notification);
            }
          },
        }
      : {}),
    createProcessingError: (cause) =>
      new PolarSubscriptionProcessingError(processingErrorMessage, { cause }),
  });
}

async function resolvePolarSubscriptionOrder(
  order: WebhookOrderPaidPayload['data'],
): Promise<SubscriptionNotificationResolution> {
  if (!subscriptionBillingReasons.has(order.billingReason)) {
    return { kind: 'ignored' };
  }

  if (!isKnownSubscriptionProduct(order.productId)) {
    return { kind: 'ignored' };
  }

  if (order.subscriptionId === null) {
    throw new PolarSubscriptionValidationError();
  }

  const subscription = order.subscription;

  if (
    !subscription ||
    subscription.id !== order.subscriptionId ||
    subscription.customerId !== order.customerId ||
    subscription.productId !== order.productId
  ) {
    throw new PolarSubscriptionValidationError();
  }

  const metadata = order.metadata;
  const userId = getMetadataString(metadata, 'userId');
  const planId = getMetadataString(metadata, 'planId');
  const purchaseKind = getMetadataString(metadata, 'purchaseKind');
  const metadataProductId = getMetadataString(metadata, 'productId');

  if (!userId || !planId || !purchaseKind || !metadataProductId) {
    throw new PolarSubscriptionValidationError();
  }

  const plan = getCatalogPlan(planId);

  if (plan?.kind !== 'subscription' || purchaseKind !== 'subscription') {
    throw new PolarSubscriptionValidationError();
  }

  const expectedProductId = getPolarProductId(plan.id);
  const expectedPriceId = plan.providers.polar?.priceId;

  assertSubscriptionOrderMetadata(
    order,
    subscription,
    plan,
    userId,
    expectedProductId,
    expectedPriceId,
  );
  assertSubscriptionProduct(order, subscription, plan, expectedProductId, expectedPriceId);

  const customerExternalId = order.customer.externalId;

  if (customerExternalId !== userId || subscription.customerId !== order.customer.id) {
    throw new PolarSubscriptionValidationError();
  }

  const user = await getBillingUser(userId);

  if (!user) {
    throw new PolarSubscriptionValidationError();
  }

  if (
    order.paid !== true ||
    order.status !== 'paid' ||
    !isValidAmount(order.totalAmount) ||
    !isLowercaseCurrency(order.currency)
  ) {
    throw new PolarSubscriptionValidationError();
  }

  if (subscription.currency !== order.currency || !isValidAmount(subscription.amount)) {
    throw new PolarSubscriptionValidationError();
  }

  if (!isValidDate(order.createdAt)) {
    throw new PolarSubscriptionValidationError();
  }

  return {
    kind: 'notify',
    notification: {
      kind: 'purchase-receipt',
      email: user.email,
      locale: readBillingLocale(metadata),
      purchaseKind: 'subscription',
      interval: plan.interval,
      amount: order.totalAmount,
      currency: order.currency,
      occurredAt: order.createdAt,
    },
  };
}

function assertSubscriptionOrderMetadata(
  order: WebhookOrderPaidPayload['data'],
  subscription: NonNullable<WebhookOrderPaidPayload['data']['subscription']>,
  plan: SubscriptionPlan,
  userId: string,
  expectedProductId: string,
  expectedPriceId: string | undefined,
): void {
  if (
    getMetadataString(order.metadata, 'userId') !== userId ||
    getMetadataString(order.metadata, 'planId') !== plan.id ||
    getMetadataString(order.metadata, 'purchaseKind') !== 'subscription' ||
    getMetadataString(order.metadata, 'productId') !== expectedProductId ||
    getMetadataString(order.metadata, 'referenceId') !== userId
  ) {
    throw new PolarSubscriptionValidationError();
  }

  assertSubscriptionMetadata(
    subscription.metadata,
    plan,
    userId,
    expectedProductId,
    expectedPriceId,
  );
  assertPriceMetadata(order.metadata, expectedPriceId);

  if (readBillingLocale(subscription.metadata) !== readBillingLocale(order.metadata)) {
    throw new PolarSubscriptionValidationError();
  }
}

function assertSubscriptionProduct(
  order: WebhookOrderPaidPayload['data'],
  subscription: NonNullable<WebhookOrderPaidPayload['data']['subscription']>,
  plan: SubscriptionPlan,
  expectedProductId: string,
  expectedPriceId: string | undefined,
): void {
  if (
    order.productId !== expectedProductId ||
    order.product?.id !== expectedProductId ||
    order.product.isRecurring !== true ||
    subscription.productId !== expectedProductId ||
    subscription.status === 'canceled' ||
    subscription.recurringInterval !== plan.interval ||
    subscription.recurringIntervalCount !== 1 ||
    order.items.filter((item) => !item.proration).length !== 1
  ) {
    throw new PolarSubscriptionValidationError();
  }

  const item = order.items.find((candidate) => !candidate.proration);

  if (!item || (expectedPriceId && item.productPriceId !== expectedPriceId)) {
    throw new PolarSubscriptionValidationError();
  }

  if (!expectedPriceId && item.productPriceId !== null) {
    throw new PolarSubscriptionValidationError();
  }
}
