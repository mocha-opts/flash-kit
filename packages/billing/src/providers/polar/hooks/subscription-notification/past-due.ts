import type { WebhookSubscriptionPastDuePayload } from '@polar-sh/sdk/models/components/webhooksubscriptionpastduepayload.js';
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
  assertSubscriptionMetadata,
  getMetadataString,
  isKnownSubscriptionProduct,
  isLowercaseCurrency,
  isValidAmount,
  isValidDate,
  readBillingLocale,
  requireNonEmptyId,
} from './validation';

const paymentFailureErrorCode = 'subscription_payment_failure_processing_failed';
const paymentFailureErrorMessage = 'Subscription payment failure processing failed.';

/** Emits one payment-failed notification per Polar past-due transition. */
export async function handlePolarSubscriptionPastDue(
  payload: WebhookSubscriptionPastDuePayload,
  options: BillingNotificationOptions = {},
): Promise<void> {
  const subscription = payload.data;
  const sender = options.notificationSender;
  const eventTimestamp = payload.timestamp;

  if (!isValidDate(eventTimestamp)) {
    throw new PolarSubscriptionValidationError();
  }

  await processBillingEvent({
    identity: {
      provider: 'polar',
      providerEventId: `subscription.past_due:${requireNonEmptyId(subscription.id)}:${eventTimestamp.toISOString()}`,
      eventType: 'subscription.past_due',
    },
    resolve: async () => resolvePolarSubscriptionPastDue(payload),
    apply: async (_transaction, resolution) =>
      resolution.kind === 'ignored' ? 'ignored' : 'processed',
    failure: {
      code: paymentFailureErrorCode,
      message: paymentFailureErrorMessage,
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
      new PolarSubscriptionProcessingError(paymentFailureErrorMessage, { cause }),
  });
}

async function resolvePolarSubscriptionPastDue(
  payload: WebhookSubscriptionPastDuePayload,
): Promise<SubscriptionNotificationResolution> {
  const subscription = payload.data;
  const metadata = subscription.metadata;
  const userId = getMetadataString(metadata, 'userId');
  const planId = getMetadataString(metadata, 'planId');
  const purchaseKind = getMetadataString(metadata, 'purchaseKind');
  const metadataProductId = getMetadataString(metadata, 'productId');

  if (!isKnownSubscriptionProduct(subscription.productId)) {
    return { kind: 'ignored' };
  }

  if (!userId || !planId || !purchaseKind || !metadataProductId) {
    throw new PolarSubscriptionValidationError();
  }

  const plan = getCatalogPlan(planId);

  if (plan?.kind !== 'subscription' || purchaseKind !== 'subscription') {
    throw new PolarSubscriptionValidationError();
  }

  const expectedProductId = getPolarProductId(plan.id);
  const expectedPriceId = plan.providers.polar?.priceId;

  assertSubscriptionMetadata(
    subscription.metadata,
    plan,
    userId,
    expectedProductId,
    expectedPriceId,
  );
  assertSubscriptionPayloadProduct(subscription, plan, expectedProductId, expectedPriceId);

  if (
    subscription.status !== 'past_due' ||
    subscription.customer.externalId !== userId ||
    subscription.customerId !== subscription.customer.id
  ) {
    throw new PolarSubscriptionValidationError();
  }

  if (!subscription.pastDueAt) {
    throw new PolarSubscriptionValidationError();
  }

  const user = await getBillingUser(userId);

  if (!user || !isValidAmount(subscription.amount) || !isLowercaseCurrency(subscription.currency)) {
    throw new PolarSubscriptionValidationError();
  }

  if (!isValidDate(payload.timestamp)) {
    throw new PolarSubscriptionValidationError();
  }

  const occurredAt = subscription.pastDueAt;

  if (!isValidDate(occurredAt)) {
    throw new PolarSubscriptionValidationError();
  }

  return {
    kind: 'notify',
    notification: {
      kind: 'payment-failed',
      email: user.email,
      locale: readBillingLocale(metadata),
      interval: plan.interval,
      amount: subscription.amount,
      currency: subscription.currency,
      occurredAt,
    },
  };
}

function assertSubscriptionPayloadProduct(
  subscription: WebhookSubscriptionPastDuePayload['data'],
  plan: SubscriptionPlan,
  expectedProductId: string,
  expectedPriceId: string | undefined,
): void {
  if (
    subscription.productId !== expectedProductId ||
    subscription.product?.id !== expectedProductId ||
    subscription.product.isRecurring !== true ||
    subscription.recurringInterval !== plan.interval ||
    subscription.recurringIntervalCount !== 1 ||
    subscription.status !== 'past_due'
  ) {
    throw new PolarSubscriptionValidationError();
  }

  if (expectedPriceId) {
    const priceIds = subscription.product.prices
      .map((price) => ('id' in price && typeof price.id === 'string' ? price.id : null))
      .filter((priceId): priceId is string => priceId !== null);

    if (!priceIds.includes(expectedPriceId)) {
      throw new PolarSubscriptionValidationError();
    }
  }
}
