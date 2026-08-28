import { getBillingUser } from '@repo/db/queries/billing';
import type Stripe from 'stripe';

import { getCatalogPlan } from '#billing-config/index';
import { getStripePriceId, getStripeProductId } from '#internal/catalog-pricing';
import {
  type PurchaseEventResolution,
  processPurchaseEvent,
} from '#internal/process-purchase-event';
import { createStripeClient } from '#providers/stripe/stripe-client';
import type { CatalogPlan } from '#types';
import { handleStripeDisputeEvent, isStripeDisputeEventType } from './on-dispute';
import { handleStripeRefundEvent, isStripeRefundEventType } from './on-refund';

const oneTimeCheckoutEventTypes = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
]);

const lifetimePlanId = 'lifetime';
const creditPackPlanId = 'credit-pack-100';
const lifetimePurchaseKind = 'lifetime';
const creditPackPurchaseKind = 'credit-package';
const processingErrorCode = 'one_time_checkout_processing_failed';
const processingErrorMessage = 'One-time checkout processing failed.';

type OneTimeCheckoutEventType =
  | 'checkout.session.completed'
  | 'checkout.session.async_payment_succeeded'
  | 'checkout.session.async_payment_failed';

type OneTimePlan = Extract<CatalogPlan, { readonly kind: 'lifetime' | 'credit-package' }>;

type OneTimePurchaseFacts = {
  readonly userId: string;
  readonly provider: 'stripe';
  readonly providerOrderId: string;
  readonly providerCheckoutId: string;
  readonly productId: string;
  readonly planId: string;
  readonly kind: 'lifetime' | 'credit_pack';
  readonly status: 'paid';
  readonly amount: number;
  readonly currency: string;
  readonly purchasedAt: Date;
  readonly creditGrant?: {
    readonly amount: number;
    readonly description: string;
  };
};

/**
 * Handles only one-time Lifetime and Credit Pack events after Better Auth has
 * verified the Stripe signature. Subscription events remain owned by the
 * official plugin.
 */
export async function handleStripeBillingEvent(event: Stripe.Event): Promise<void> {
  if (isStripeRefundEventType(event.type)) {
    await handleStripeRefundEvent(event);
    return;
  }

  if (isStripeDisputeEventType(event.type)) {
    await handleStripeDisputeEvent(event);
    return;
  }

  const eventType = toOneTimeCheckoutEventType(event.type);
  const session = getCheckoutSession(event, eventType);

  if (!eventType || !session || !isOneTimeCheckout(session)) {
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
      code: processingErrorCode,
      message: processingErrorMessage,
    },
  });
}

async function resolveStripePurchase(
  eventType: OneTimeCheckoutEventType,
  session: Stripe.Checkout.Session,
): Promise<PurchaseEventResolution> {
  if (eventType === 'checkout.session.async_payment_failed') {
    return { kind: 'ignored' };
  }

  const purchase = await getOneTimePurchaseFacts(session);

  return purchase
    ? {
        kind: 'paid',
        purchase,
        ...(purchase.creditGrant ? { creditGrant: purchase.creditGrant } : {}),
      }
    : { kind: 'ignored' };
}

function toOneTimeCheckoutEventType(value: string): OneTimeCheckoutEventType | null {
  return oneTimeCheckoutEventTypes.has(value) ? (value as OneTimeCheckoutEventType) : null;
}

function getCheckoutSession(
  event: Stripe.Event,
  eventType: OneTimeCheckoutEventType | null,
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

function isOneTimeCheckout(session: Stripe.Checkout.Session): boolean {
  return (
    session.mode === 'payment' &&
    (session.metadata?.purchaseKind === lifetimePurchaseKind ||
      session.metadata?.purchaseKind === creditPackPurchaseKind ||
      session.metadata?.planId === lifetimePlanId ||
      session.metadata?.planId === creditPackPlanId)
  );
}

async function getOneTimePurchaseFacts(
  eventSession: Stripe.Checkout.Session,
): Promise<OneTimePurchaseFacts | null> {
  const providerCheckoutId = requireCheckoutId(eventSession.id);
  const client = createStripeClient();
  const session = await client.checkout.sessions.retrieve(eventSession.id, {
    expand: ['line_items.data.price.product', 'payment_intent'],
  });
  const plan = resolveOneTimePlan(session.metadata);

  if (!plan) {
    throw new OneTimeCheckoutValidationError();
  }

  const expectedProductId = getStripeProductId(plan.id);
  const expectedPriceId = getStripePriceId(plan.id);
  const { userId, credits: checkoutCredits } = assertSessionMetadata(
    session,
    plan,
    expectedProductId,
    expectedPriceId,
  );

  if (session.mode !== 'payment') {
    throw new OneTimeCheckoutValidationError();
  }

  if (session.payment_status !== 'paid') {
    return null;
  }

  if (session.status !== 'complete') {
    throw new OneTimeCheckoutValidationError();
  }

  if (session.client_reference_id !== userId) {
    throw new OneTimeCheckoutValidationError();
  }

  const user = await getBillingUser(userId);

  if (!user) {
    throw new OneTimeCheckoutValidationError();
  }

  const sessionCustomerId = getStripeObjectId(session.customer);

  if (!sessionCustomerId || !user.stripeCustomerId || sessionCustomerId !== user.stripeCustomerId) {
    throw new OneTimeCheckoutValidationError();
  }

  const lineItem = getOnlyLineItem(session);
  const price = lineItem.price;
  const productId = getStripeObjectId(price?.product);

  if (
    lineItem.quantity !== 1 ||
    !price ||
    price.type !== 'one_time' ||
    price.id !== expectedPriceId ||
    productId !== expectedProductId
  ) {
    throw new OneTimeCheckoutValidationError();
  }

  const paymentIntent = await resolvePaymentIntent(client, session.payment_intent);

  if (paymentIntent?.status !== 'succeeded') {
    throw new OneTimeCheckoutValidationError();
  }

  assertPaymentIntentMetadata(
    paymentIntent,
    plan,
    userId,
    expectedProductId,
    expectedPriceId,
    checkoutCredits,
  );

  const paymentIntentCustomerId = getStripeObjectId(paymentIntent.customer);

  if (paymentIntentCustomerId !== sessionCustomerId) {
    throw new OneTimeCheckoutValidationError();
  }

  if (!paymentIntent.id.startsWith('pi_')) {
    throw new OneTimeCheckoutValidationError();
  }

  if (!Number.isSafeInteger(paymentIntent.amount_received) || paymentIntent.amount_received <= 0) {
    throw new OneTimeCheckoutValidationError();
  }

  if (!/^[a-z]{3}$/u.test(paymentIntent.currency)) {
    throw new OneTimeCheckoutValidationError();
  }

  const purchasedAt = toDate(paymentIntent.created);

  if (!purchasedAt) {
    throw new OneTimeCheckoutValidationError();
  }

  const creditAmount =
    plan.kind === 'credit-package' ? requireCreditAmount(checkoutCredits) : undefined;

  return {
    userId,
    provider: 'stripe',
    providerOrderId: paymentIntent.id,
    providerCheckoutId,
    productId: expectedProductId,
    planId: plan.id,
    kind: plan.kind === 'credit-package' ? 'credit_pack' : 'lifetime',
    status: 'paid',
    amount: paymentIntent.amount_received,
    currency: paymentIntent.currency,
    purchasedAt,
    ...(creditAmount !== undefined
      ? {
          creditGrant: {
            amount: creditAmount,
            description: `Credit pack purchase (${creditAmount} credits)`,
          },
        }
      : {}),
  };
}

function resolveOneTimePlan(metadata: Stripe.Metadata | null): OneTimePlan | null {
  const planId = metadata?.planId;
  const purchaseKind = metadata?.purchaseKind;

  if (planId !== lifetimePlanId && planId !== creditPackPlanId) {
    return null;
  }

  if (
    (planId === lifetimePlanId && purchaseKind !== lifetimePurchaseKind) ||
    (planId === creditPackPlanId && purchaseKind !== creditPackPurchaseKind)
  ) {
    return null;
  }

  const plan = getCatalogPlan(planId);

  if (plan?.kind !== 'lifetime' && plan?.kind !== 'credit-package') {
    return null;
  }

  return plan;
}

function assertSessionMetadata(
  session: Stripe.Checkout.Session,
  plan: OneTimePlan,
  productId: string,
  priceId: string,
): { readonly userId: string; readonly credits: number | undefined } {
  const metadata = session.metadata;
  const userId = metadata?.userId;

  if (
    !userId ||
    metadata.planId !== plan.id ||
    metadata.purchaseKind !== plan.kind ||
    metadata.productId !== productId ||
    metadata.priceId !== priceId
  ) {
    throw new OneTimeCheckoutValidationError();
  }

  const credits = readCreditMetadata(metadata, plan);

  return { userId, credits };
}

function getOnlyLineItem(session: Stripe.Checkout.Session): Stripe.LineItem {
  const lineItems = session.line_items;

  if (!lineItems || lineItems.has_more || lineItems.data.length !== 1) {
    throw new OneTimeCheckoutValidationError();
  }

  const lineItem = lineItems.data[0];

  if (!lineItem) {
    throw new OneTimeCheckoutValidationError();
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
  plan: OneTimePlan,
  userId: string,
  productId: string,
  priceId: string,
  sessionCredits: number | undefined,
): void {
  const metadata = paymentIntent.metadata;

  if (
    metadata.userId !== userId ||
    metadata.planId !== plan.id ||
    metadata.purchaseKind !== plan.kind ||
    metadata.productId !== productId ||
    metadata.priceId !== priceId
  ) {
    throw new OneTimeCheckoutValidationError();
  }

  const paymentIntentCredits = readCreditMetadata(metadata, plan);

  if (paymentIntentCredits !== sessionCredits) {
    throw new OneTimeCheckoutValidationError();
  }
}

function readCreditMetadata(
  metadata: Stripe.Metadata | null,
  plan: OneTimePlan,
): number | undefined {
  if (plan.kind === 'lifetime') {
    if (metadata?.credits !== undefined) {
      throw new OneTimeCheckoutValidationError();
    }

    return undefined;
  }

  const rawCredits = metadata?.credits;

  if (!rawCredits || !/^[1-9][0-9]*$/u.test(rawCredits)) {
    throw new OneTimeCheckoutValidationError();
  }

  const credits = Number(rawCredits);

  if (!Number.isSafeInteger(credits) || credits <= 0) {
    throw new OneTimeCheckoutValidationError();
  }

  return credits;
}

function requireCreditAmount(value: number | undefined): number {
  if (value === undefined) {
    throw new OneTimeCheckoutValidationError();
  }

  return value;
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
    throw new OneTimeCheckoutValidationError();
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

class OneTimeCheckoutValidationError extends Error {
  override readonly name = 'OneTimeCheckoutValidationError';
}
