import { getBillingUser } from '@repo/db/queries/billing';
import type Stripe from 'stripe';

import { getStripePriceId, getStripeProductId } from '#internal/catalog-pricing';
import {
  type PurchaseEventResolution,
  processPurchaseEvent,
} from '#internal/process-purchase-event';
import { createStripeClient } from '#providers/stripe/stripe-client';

const lifetimeCheckoutEventTypes = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
]);

const lifetimePlanId = 'lifetime';
const lifetimePurchaseKind = 'lifetime';
const lifetimeProcessingErrorCode = 'lifetime_checkout_processing_failed';
const lifetimeProcessingErrorMessage = 'Lifetime checkout processing failed.';

type LifetimeCheckoutEventType =
  | 'checkout.session.completed'
  | 'checkout.session.async_payment_succeeded'
  | 'checkout.session.async_payment_failed';

type LifetimePurchaseFacts = {
  readonly userId: string;
  readonly provider: 'stripe';
  readonly providerOrderId: string;
  readonly providerCheckoutId: string;
  readonly productId: string;
  readonly planId: 'lifetime';
  readonly kind: 'lifetime';
  readonly status: 'paid';
  readonly amount: number;
  readonly currency: string;
  readonly purchasedAt: Date;
};

/**
 * Handles only Lifetime Checkout events after Better Auth has verified the
 * Stripe signature. Subscription events remain owned by the official plugin.
 */
export async function handleStripeBillingEvent(event: Stripe.Event): Promise<void> {
  const eventType = toLifetimeCheckoutEventType(event.type);
  const session = getCheckoutSession(event, eventType);

  if (!eventType || !session || !isLifetimeCheckout(session)) {
    return;
  }

  await processPurchaseEvent({
    identity: {
      provider: 'stripe',
      providerEventId: event.id,
      eventType,
    },
    resolve: async () => resolveStripePurchase(eventType, session),
    failure: {
      code: lifetimeProcessingErrorCode,
      message: lifetimeProcessingErrorMessage,
    },
  });
}

async function resolveStripePurchase(
  eventType: LifetimeCheckoutEventType,
  session: Stripe.Checkout.Session,
): Promise<PurchaseEventResolution> {
  if (eventType === 'checkout.session.async_payment_failed') {
    return { kind: 'ignored' };
  }

  const purchase = await getLifetimePurchaseFacts(session);

  return purchase ? { kind: 'paid', purchase } : { kind: 'ignored' };
}

function toLifetimeCheckoutEventType(value: string): LifetimeCheckoutEventType | null {
  return lifetimeCheckoutEventTypes.has(value) ? (value as LifetimeCheckoutEventType) : null;
}

function getCheckoutSession(
  event: Stripe.Event,
  eventType: LifetimeCheckoutEventType | null,
): Stripe.Checkout.Session | null {
  if (!eventType) {
    return null;
  }

  const candidate: unknown = event.data.object;

  if (!isCheckoutSession(candidate)) {
    return null;
  }

  return candidate;
}

function isCheckoutSession(value: unknown): value is Stripe.Checkout.Session {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  return (
    'object' in value &&
    value.object === 'checkout.session' &&
    'id' in value &&
    typeof value.id === 'string'
  );
}

function isLifetimeCheckout(session: Stripe.Checkout.Session): boolean {
  return (
    session.mode === 'payment' &&
    (session.metadata?.purchaseKind === lifetimePurchaseKind ||
      session.metadata?.planId === lifetimePlanId)
  );
}

async function getLifetimePurchaseFacts(
  eventSession: Stripe.Checkout.Session,
): Promise<LifetimePurchaseFacts | null> {
  const providerCheckoutId = requireCheckoutId(eventSession.id);
  const client = createStripeClient();
  const session = await client.checkout.sessions.retrieve(eventSession.id, {
    expand: ['line_items.data.price.product', 'payment_intent'],
  });

  assertSessionMetadata(session);

  if (session.mode !== 'payment' || session.status !== 'complete') {
    throw new LifetimeCheckoutValidationError();
  }

  if (session.payment_status !== 'paid') {
    return null;
  }

  const userId = session.metadata?.userId;
  const clientReferenceId = session.client_reference_id;

  if (!userId || clientReferenceId !== userId) {
    throw new LifetimeCheckoutValidationError();
  }

  const user = await getBillingUser(userId);

  if (!user) {
    throw new LifetimeCheckoutValidationError();
  }

  const sessionCustomerId = getStripeObjectId(session.customer);

  if (!sessionCustomerId || !user.stripeCustomerId || sessionCustomerId !== user.stripeCustomerId) {
    throw new LifetimeCheckoutValidationError();
  }

  const lineItem = getOnlyLineItem(session);
  const price = lineItem.price;
  const productId = getStripeObjectId(price?.product);
  const expectedProductId = getStripeProductId(lifetimePlanId);
  const expectedPriceId = getStripePriceId(lifetimePlanId);

  if (
    lineItem.quantity !== 1 ||
    !price ||
    price.type !== 'one_time' ||
    price.id !== expectedPriceId ||
    productId !== expectedProductId
  ) {
    throw new LifetimeCheckoutValidationError();
  }

  const paymentIntent = await resolvePaymentIntent(client, session.payment_intent);

  if (paymentIntent?.status !== 'succeeded') {
    throw new LifetimeCheckoutValidationError();
  }

  assertPaymentIntentMetadata(paymentIntent, userId, expectedProductId, expectedPriceId);

  const paymentIntentCustomerId = getStripeObjectId(paymentIntent.customer);

  if (paymentIntentCustomerId !== sessionCustomerId) {
    throw new LifetimeCheckoutValidationError();
  }

  if (!paymentIntent.id.startsWith('pi_')) {
    throw new LifetimeCheckoutValidationError();
  }

  if (!Number.isSafeInteger(paymentIntent.amount_received) || paymentIntent.amount_received <= 0) {
    throw new LifetimeCheckoutValidationError();
  }

  if (!/^[a-z]{3}$/u.test(paymentIntent.currency)) {
    throw new LifetimeCheckoutValidationError();
  }

  const purchasedAt = toDate(paymentIntent.created);

  if (!purchasedAt) {
    throw new LifetimeCheckoutValidationError();
  }

  return {
    userId,
    provider: 'stripe',
    providerOrderId: paymentIntent.id,
    providerCheckoutId,
    productId: expectedProductId,
    planId: lifetimePlanId,
    kind: lifetimePurchaseKind,
    status: 'paid',
    amount: paymentIntent.amount_received,
    currency: paymentIntent.currency,
    purchasedAt,
  };
}

function assertSessionMetadata(session: Stripe.Checkout.Session): void {
  const metadata = session.metadata;

  if (
    metadata?.purchaseKind !== lifetimePurchaseKind ||
    metadata.planId !== lifetimePlanId ||
    metadata.productId !== getStripeProductId(lifetimePlanId) ||
    metadata.priceId !== getStripePriceId(lifetimePlanId)
  ) {
    throw new LifetimeCheckoutValidationError();
  }
}

function getOnlyLineItem(session: Stripe.Checkout.Session): Stripe.LineItem {
  const lineItems = session.line_items;

  if (!lineItems || lineItems.has_more || lineItems.data.length !== 1) {
    throw new LifetimeCheckoutValidationError();
  }

  const lineItem = lineItems.data[0];

  if (!lineItem) {
    throw new LifetimeCheckoutValidationError();
  }

  return lineItem;
}

async function resolvePaymentIntent(
  client: Stripe,
  paymentIntent: Stripe.Checkout.Session['payment_intent'],
): Promise<Stripe.PaymentIntent | null> {
  const paymentIntentId = getStripeObjectId(paymentIntent);

  if (!paymentIntentId) {
    return null;
  }

  if (typeof paymentIntent === 'object' && paymentIntent !== null) {
    return paymentIntent;
  }

  return await client.paymentIntents.retrieve(paymentIntentId);
}

function assertPaymentIntentMetadata(
  paymentIntent: Stripe.PaymentIntent,
  userId: string,
  productId: string,
  priceId: string,
): void {
  const metadata = paymentIntent.metadata;

  if (
    metadata.userId !== userId ||
    metadata.planId !== lifetimePlanId ||
    metadata.purchaseKind !== lifetimePurchaseKind ||
    metadata.productId !== productId ||
    metadata.priceId !== priceId
  ) {
    throw new LifetimeCheckoutValidationError();
  }
}

function getStripeObjectId(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value !== 'object' || value === null || !('id' in value)) {
    return null;
  }

  return typeof value.id === 'string' ? value.id : null;
}

function requireCheckoutId(value: string): string {
  if (!value.startsWith('cs_')) {
    throw new LifetimeCheckoutValidationError();
  }

  return value;
}

function toDate(value: number): Date | null {
  if (!Number.isSafeInteger(value) || value <= 0) {
    return null;
  }

  const date = new Date(value * 1000);

  return Number.isNaN(date.getTime()) ? null : date;
}

class LifetimeCheckoutValidationError extends Error {
  override readonly name = 'LifetimeCheckoutValidationError';
}
