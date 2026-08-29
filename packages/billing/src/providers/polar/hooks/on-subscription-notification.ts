import 'server-only';

import type { WebhooksOptions } from '@polar-sh/better-auth';
import type { WebhookOrderPaidPayload } from '@polar-sh/sdk/models/components/webhookorderpaidpayload.js';

import { handlePolarOrderPaid } from '#providers/polar/hooks/on-order-paid';
import { handlePolarSubscriptionOrderPaid } from '#providers/polar/hooks/subscription-notification/paid-order';
import { handlePolarSubscriptionPastDue } from '#providers/polar/hooks/subscription-notification/past-due';
import type { BillingNotificationOptions } from '#types';

type PolarWebhookPayload = Parameters<NonNullable<WebhooksOptions['onPayload']>>[0];

export { handlePolarSubscriptionOrderPaid, handlePolarSubscriptionPastDue };

/** Routes Polar subscription orders away from the one-time purchase handler. */
export function createPolarOrderPaidHandler(
  options: BillingNotificationOptions = {},
): (payload: WebhookOrderPaidPayload) => Promise<void> {
  return async (payload) => {
    if (payload.data.billingReason === 'purchase') {
      await handlePolarOrderPaid(payload, options);
      return;
    }

    await handlePolarSubscriptionOrderPaid(payload, options);
  };
}

/**
 * Installs the narrow Polar `subscription.past_due` listener. The generic
 * callback intentionally ignores every other signed payload because the
 * Better Auth adapter dispatches those to their dedicated handlers.
 */
export function createPolarSubscriptionPayloadHandler(
  options: BillingNotificationOptions = {},
): (payload: PolarWebhookPayload) => Promise<void> {
  return async (payload) => {
    if (payload.type !== 'subscription.past_due') {
      return;
    }

    await handlePolarSubscriptionPastDue(payload, options);
  };
}
