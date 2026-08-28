import 'server-only';

import type Stripe from 'stripe';

import type { StripePaymentContext, StripeSubscriptionSnapshot } from './contract';
import {
  getStripeObjectId,
  isNonEmpty,
  readStripeObjectId,
  readStripeRecord,
  readStripeString,
  requireCurrency,
  requirePositiveInteger,
  requirePrefixedString,
  requireStripeCustomerId,
  requireStripeId,
  StripeRefundDisputeValidationError,
  stripeChargeIdPattern,
  stripePaymentIntentIdPattern,
  uuidPattern,
} from './validation';

/** Resolves an app-owned one-time PaymentIntent or a live Stripe Subscription. */
export async function resolveStripePaymentContext(
  client: Stripe,
  paymentIntent: Stripe.PaymentIntent,
): Promise<StripePaymentContext | null> {
  const metadata = paymentIntent.metadata ?? {};
  const hasApplicationMetadata = [
    metadata.userId,
    metadata.planId,
    metadata.purchaseKind,
    metadata.productId,
    metadata.priceId,
  ].some((value) => value !== undefined);

  if (metadata.purchaseKind === 'lifetime' || metadata.purchaseKind === 'credit-package') {
    const userId = metadata.userId;

    if (!userId || !uuidPattern.test(userId)) {
      throw new StripeRefundDisputeValidationError('Stripe Purchase metadata has no valid user.');
    }

    const isLifetime = metadata.purchaseKind === 'lifetime';
    const expectedPlanId = isLifetime ? 'lifetime' : 'credit-pack-100';

    if (
      metadata.planId !== expectedPlanId ||
      !isNonEmpty(metadata.productId) ||
      !isNonEmpty(metadata.priceId)
    ) {
      throw new StripeRefundDisputeValidationError('Stripe Purchase metadata is inconsistent.');
    }

    const customerId = requireStripeCustomerId(paymentIntent.customer);
    await assertCustomerMetadata(client, customerId, userId);

    return {
      kind: 'purchase',
      userId,
      providerOrderId: requireStripeId(
        paymentIntent,
        'PaymentIntent',
        stripePaymentIntentIdPattern,
      ),
      purchaseKind: isLifetime ? 'lifetime' : 'credit_pack',
      customerId,
    };
  }

  if (
    hasApplicationMetadata &&
    (metadata.purchaseKind !== 'subscription' || !isNonEmpty(metadata.planId))
  ) {
    throw new StripeRefundDisputeValidationError('Stripe PaymentIntent metadata is unknown.');
  }

  const customerId = requireStripeCustomerId(paymentIntent.customer);
  const subscription = await resolveStripeSubscription(client, paymentIntent, customerId);

  if (!subscription) {
    if (metadata.purchaseKind === 'subscription') {
      throw new StripeRefundDisputeValidationError(
        'Stripe Subscription could not be associated with the PaymentIntent.',
      );
    }

    return null;
  }

  return {
    kind: 'subscription',
    providerOrderId: requireStripeId(paymentIntent, 'PaymentIntent', stripePaymentIntentIdPattern),
    customerId,
    subscription,
  };
}

async function resolveStripeSubscription(
  client: Stripe,
  paymentIntent: Stripe.PaymentIntent,
  customerId: string,
): Promise<StripeSubscriptionSnapshot | null> {
  const directSubscriptionId = readStripeString(paymentIntent, 'subscription');
  const relatedCharge = await resolveCharge(client, paymentIntent.latest_charge, paymentIntent);
  const invoiceId =
    readStripeString(paymentIntent, 'invoice') ?? readStripeString(relatedCharge, 'invoice');

  const subscriptionId =
    (directSubscriptionId && requirePrefixedString(directSubscriptionId, 'sub_')) ||
    (invoiceId && (await resolveInvoiceSubscriptionId(client, invoiceId))) ||
    (await resolveSubscriptionIdFromInvoiceList(client, paymentIntent.id, customerId));

  if (!subscriptionId) {
    const subscriptions = await client.subscriptions.list({
      customer: customerId,
      status: 'all',
      limit: 100,
    });

    if (subscriptions.data.length !== 1) {
      return null;
    }

    return toSubscriptionSnapshot(subscriptions.data[0], customerId);
  }

  const subscription = await client.subscriptions.retrieve(subscriptionId);

  return toSubscriptionSnapshot(subscription, customerId);
}

async function resolveInvoiceSubscriptionId(
  client: Stripe,
  invoiceId: string,
): Promise<string | null> {
  const invoice = await client.invoices.retrieve(invoiceId);
  const direct = readStripeString(invoice, 'subscription');

  if (direct) {
    return requirePrefixedString(direct, 'sub_');
  }

  const parent = readStripeRecord(invoice, 'parent');
  const subscriptionDetails = parent ? readStripeRecord(parent, 'subscription_details') : null;
  const nested = subscriptionDetails ? readStripeString(subscriptionDetails, 'subscription') : null;

  return nested ? requirePrefixedString(nested, 'sub_') : null;
}

async function resolveSubscriptionIdFromInvoiceList(
  client: Stripe,
  paymentIntentId: string,
  customerId: string,
): Promise<string | null> {
  const invoices = await client.invoices.list({ customer: customerId, limit: 100 });

  for (const invoice of invoices.data) {
    const invoicePaymentIntentId = readStripeObjectId(invoice, 'payment_intent');

    if (invoicePaymentIntentId !== paymentIntentId) {
      continue;
    }

    const subscriptionId = readStripeString(invoice, 'subscription');

    if (subscriptionId) {
      return requirePrefixedString(subscriptionId, 'sub_');
    }

    const parent = readStripeRecord(invoice, 'parent');
    const subscriptionDetails = parent ? readStripeRecord(parent, 'subscription_details') : null;
    const nested = subscriptionDetails
      ? readStripeString(subscriptionDetails, 'subscription')
      : null;

    return nested ? requirePrefixedString(nested, 'sub_') : null;
  }

  return null;
}

function toSubscriptionSnapshot(
  subscription: Stripe.Subscription | null | undefined,
  expectedCustomerId: string,
): StripeSubscriptionSnapshot {
  if (!subscription) {
    throw new StripeRefundDisputeValidationError('Stripe returned an invalid Subscription.');
  }

  requirePrefixedString(subscription.id, 'sub_');

  const actualCustomerId = getStripeObjectId(subscription.customer);

  if (actualCustomerId !== expectedCustomerId) {
    throw new StripeRefundDisputeValidationError('Stripe Subscription customer does not match.');
  }

  return {
    id: subscription.id,
    customerId: actualCustomerId,
    rawStatus: subscription.status,
    status: normalizeSubscriptionStatus(subscription.status),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}

export async function resolvePaymentIntent(
  client: Stripe,
  value: unknown,
): Promise<Stripe.PaymentIntent> {
  const paymentIntentId = getStripeObjectId(value);

  if (!paymentIntentId || !stripePaymentIntentIdPattern.test(paymentIntentId)) {
    throw new StripeRefundDisputeValidationError('Stripe event has no PaymentIntent association.');
  }

  const paymentIntent = await client.paymentIntents.retrieve(paymentIntentId);

  if (
    paymentIntent.object !== 'payment_intent' ||
    !stripePaymentIntentIdPattern.test(paymentIntent.id) ||
    paymentIntent.status !== 'succeeded'
  ) {
    throw new StripeRefundDisputeValidationError(
      'Stripe PaymentIntent is not a succeeded payment.',
    );
  }

  requirePositiveInteger(paymentIntent.amount_received, 'PaymentIntent received amount');
  requireCurrency(paymentIntent.currency);

  return paymentIntent;
}

export async function resolveCharge(
  client: Stripe,
  value: unknown,
  paymentIntent: unknown,
): Promise<Stripe.Charge | null> {
  const chargeId = getStripeObjectId(value);

  if (chargeId) {
    if (!stripeChargeIdPattern.test(chargeId)) {
      throw new StripeRefundDisputeValidationError('Stripe event has an invalid Charge id.');
    }

    const charge = await client.charges.retrieve(chargeId, {
      expand: ['payment_intent'],
    });

    if (charge.object !== 'charge' || charge.id !== chargeId) {
      throw new StripeRefundDisputeValidationError('Stripe returned an invalid Charge.');
    }

    return charge;
  }

  const paymentIntentId = getStripeObjectId(paymentIntent);

  if (!paymentIntentId) {
    return null;
  }

  const charges = await client.charges.list({ payment_intent: paymentIntentId, limit: 100 });

  return (
    charges.data.find((charge) => getStripeObjectId(charge.payment_intent) === paymentIntentId) ??
    null
  );
}

async function assertCustomerMetadata(
  client: Stripe,
  customerId: string,
  userId: string,
): Promise<void> {
  const customer = await client.customers.retrieve(customerId);

  if (customer.deleted) {
    throw new StripeRefundDisputeValidationError('Stripe Customer has been deleted.');
  }

  const customerUserId = customer.metadata?.userId;

  if (customerUserId !== undefined && customerUserId !== userId) {
    throw new StripeRefundDisputeValidationError('Stripe Customer metadata does not match.');
  }
}

function normalizeSubscriptionStatus(status: string): StripeSubscriptionSnapshot['status'] {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'canceled':
    case 'past_due':
      return status;
    default:
      return 'unknown';
  }
}
