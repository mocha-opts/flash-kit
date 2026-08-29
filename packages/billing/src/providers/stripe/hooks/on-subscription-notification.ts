import 'server-only';

import { getBillingUser } from '@repo/db/queries/billing';
import type Stripe from 'stripe';

import { getCatalogPlan } from '#billing-config/index';
import { getStripePriceId, getStripeProductId } from '#internal/catalog-pricing';
import { processBillingEvent } from '#internal/process-billing-event';
import { createStripeClient } from '#providers/stripe/stripe-client';
import type {
  BillingLocale,
  BillingNotification,
  BillingNotificationOptions,
  SubscriptionPlan,
} from '#types';

const subscriptionInvoiceEventTypes = new Set(['invoice.paid', 'invoice.payment_failed']);

const subscriptionBillingReasons = new Set([
  'subscription',
  'subscription_create',
  'subscription_cycle',
]);

const processingErrorCode = 'subscription_invoice_processing_failed';
const processingErrorMessage = 'Subscription invoice processing failed.';

type SubscriptionInvoiceEventType = 'invoice.paid' | 'invoice.payment_failed';

type SubscriptionInvoiceResolution =
  | { readonly kind: 'ignored' }
  | { readonly kind: 'notify'; readonly notification: BillingNotification };

/**
 * Processes only successful and failed subscription invoices. Checkout
 * completion is intentionally not handled here: the first receipt comes from
 * `invoice.paid`, which also gives renewals one stable path.
 */
export async function handleStripeSubscriptionNotification(
  event: Stripe.Event,
  options: BillingNotificationOptions = {},
): Promise<void> {
  const eventType = toSubscriptionInvoiceEventType(event.type);

  if (!eventType) {
    return;
  }

  const eventId = requireStripeEventId(event);
  const sender = options.notificationSender;

  await processBillingEvent({
    identity: {
      provider: 'stripe',
      providerEventId: eventId,
      eventType,
    },
    resolve: async () => resolveSubscriptionInvoice(event, eventType),
    apply: async (_transaction, resolution) =>
      resolution.kind === 'ignored' ? 'ignored' : 'processed',
    failure: {
      code: processingErrorCode,
      message: processingErrorMessage,
    },
    ...(sender
      ? {
          notifyAfterCommit: async (resolution: SubscriptionInvoiceResolution) => {
            if (resolution.kind === 'notify') {
              await sender(resolution.notification);
            }
          },
        }
      : {}),
    createProcessingError: (cause) =>
      new StripeSubscriptionInvoiceProcessingError(processingErrorMessage, { cause }),
  });
}

async function resolveSubscriptionInvoice(
  event: Stripe.Event,
  eventType: SubscriptionInvoiceEventType,
): Promise<SubscriptionInvoiceResolution> {
  const invoiceId = getStripeObjectId(event.data.object);

  if (!invoiceId || !/^in_[A-Za-z0-9]+$/u.test(invoiceId)) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  const client = createStripeClient();
  const invoice = await client.invoices.retrieve(invoiceId, {
    expand: ['lines.data.pricing.price_details.price', 'parent.subscription_details.subscription'],
  });

  if (invoice.id !== invoiceId || invoice.object !== 'invoice') {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  if (invoice.livemode !== event.livemode) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  if (!invoice.billing_reason || !subscriptionBillingReasons.has(invoice.billing_reason)) {
    return { kind: 'ignored' };
  }

  if (eventType === 'invoice.paid' && invoice.status !== 'paid') {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  if (eventType === 'invoice.payment_failed' && invoice.status === 'paid') {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  const subscriptionId = readInvoiceSubscriptionId(invoice);

  if (!subscriptionId) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  const subscription = await client.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price.product'],
  });
  const userId = requireSubscriptionMetadataUserId(subscription.metadata);
  const plan = requireSubscriptionPlan(subscription.metadata);
  const expectedProductId = getStripeProductId(plan.id);
  const expectedPriceId = getStripePriceId(plan.id);

  assertSubscriptionMetadata(subscription.metadata, plan, expectedProductId, expectedPriceId);
  assertInvoiceMetadata(invoice, subscription.metadata);
  assertSubscriptionPrice(subscription, plan, expectedProductId, expectedPriceId);
  assertInvoicePrice(invoice, subscriptionId, expectedProductId, expectedPriceId);

  const invoiceCustomerId = requireStripeCustomerId(invoice.customer);
  const subscriptionCustomerId = requireStripeCustomerId(subscription.customer);

  if (invoiceCustomerId !== subscriptionCustomerId) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  const customer = await client.customers.retrieve(invoiceCustomerId);

  if (isDeletedCustomer(customer) || customer.id !== invoiceCustomerId) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  const user = await getBillingUser(userId);

  // Better Auth can link a verified pre-existing Stripe Customer without
  // rewriting its metadata. The current database association, together with
  // the Subscription and Invoice metadata checks above, is authoritative.
  if (!user || user.stripeCustomerId !== invoiceCustomerId) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  const occurredAt = toDate(
    eventType === 'invoice.paid'
      ? (invoice.status_transitions.paid_at ?? invoice.created)
      : invoice.created,
  );

  if (!occurredAt || !isLowercaseCurrency(invoice.currency)) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  const amount = eventType === 'invoice.paid' ? invoice.amount_paid : invoice.amount_due;

  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    (eventType === 'invoice.payment_failed' && amount === 0)
  ) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  if (invoice.currency !== getSubscriptionCurrency(subscription)) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  const locale = readBillingLocale(subscription.metadata);

  return {
    kind: 'notify',
    notification:
      eventType === 'invoice.paid'
        ? {
            kind: 'purchase-receipt',
            email: user.email,
            locale,
            purchaseKind: 'subscription',
            interval: plan.interval,
            amount,
            currency: invoice.currency,
            occurredAt,
          }
        : {
            kind: 'payment-failed',
            email: user.email,
            locale,
            interval: plan.interval,
            amount,
            currency: invoice.currency,
            occurredAt,
          },
  };
}

function toSubscriptionInvoiceEventType(value: string): SubscriptionInvoiceEventType | null {
  return subscriptionInvoiceEventTypes.has(value) ? (value as SubscriptionInvoiceEventType) : null;
}

function requireStripeEventId(event: Stripe.Event): string {
  if (!/^evt_[A-Za-z0-9]+$/u.test(event.id)) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  return event.id;
}

function requireSubscriptionMetadataUserId(metadata: Stripe.Metadata): string {
  const userId = metadata.userId;

  if (!userId || !/^[0-9a-f-]{36}$/iu.test(userId)) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  return userId;
}

function requireSubscriptionPlan(metadata: Stripe.Metadata): SubscriptionPlan {
  const planId = metadata.planId;
  const purchaseKind = metadata.purchaseKind;

  if (!planId || purchaseKind !== 'subscription') {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  const plan = getCatalogPlan(planId);

  if (plan?.kind !== 'subscription') {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  return plan;
}

function assertSubscriptionMetadata(
  metadata: Stripe.Metadata,
  plan: SubscriptionPlan,
  expectedProductId: string,
  expectedPriceId: string,
): void {
  if (
    metadata.planId !== plan.id ||
    metadata.purchaseKind !== 'subscription' ||
    metadata.productId !== expectedProductId ||
    metadata.priceId !== expectedPriceId ||
    metadata.referenceId !== metadata.userId
  ) {
    throw new StripeSubscriptionInvoiceValidationError();
  }
}

function assertSubscriptionPrice(
  subscription: Stripe.Subscription,
  plan: SubscriptionPlan,
  expectedProductId: string,
  expectedPriceId: string,
): void {
  if (subscription.items.data.length !== 1) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  const item = subscription.items.data[0];
  const productId = getStripeObjectId(item?.price.product);

  if (
    !item ||
    item.price.id !== expectedPriceId ||
    productId !== expectedProductId ||
    item.price.type !== 'recurring' ||
    item.price.recurring?.interval !== plan.interval ||
    (item.quantity !== undefined && item.quantity !== 1)
  ) {
    throw new StripeSubscriptionInvoiceValidationError();
  }
}

function assertInvoicePrice(
  invoice: Stripe.Invoice,
  subscriptionId: string,
  expectedProductId: string,
  expectedPriceId: string,
): void {
  const lines = invoice.lines.data.filter((line) => {
    const lineSubscriptionId =
      getStripeObjectId(line.subscription) ??
      getStripeObjectId(line.parent?.subscription_item_details?.subscription) ??
      getStripeObjectId(line.parent?.invoice_item_details?.subscription);

    return lineSubscriptionId === subscriptionId;
  });

  if (lines.length === 0) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  for (const line of lines) {
    const pricing = line.pricing?.price_details;
    const priceId = getStripeObjectId(pricing?.price);
    const productId = pricing?.product;

    if (priceId !== expectedPriceId || productId !== expectedProductId) {
      throw new StripeSubscriptionInvoiceValidationError();
    }
  }
}

function assertInvoiceMetadata(
  invoice: Stripe.Invoice,
  subscriptionMetadata: Stripe.Metadata,
): void {
  const snapshot = invoice.parent?.subscription_details?.metadata;

  if (!snapshot) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  for (const key of [
    'userId',
    'planId',
    'purchaseKind',
    'productId',
    'priceId',
    'referenceId',
    'locale',
  ]) {
    if (snapshot[key] !== subscriptionMetadata[key]) {
      throw new StripeSubscriptionInvoiceValidationError();
    }
  }
}

function readInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription;
  const subscriptionId = getStripeObjectId(subscription);

  if (!subscriptionId || !/^sub_[A-Za-z0-9]+$/u.test(subscriptionId)) {
    return null;
  }

  return subscriptionId;
}

function requireStripeCustomerId(value: unknown): string {
  const customerId = getStripeObjectId(value);

  if (!customerId || !/^cus_[A-Za-z0-9]+$/u.test(customerId)) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  return customerId;
}

function getSubscriptionCurrency(subscription: Stripe.Subscription): string {
  const item = subscription.items.data[0];

  if (!item?.price.currency || !isLowercaseCurrency(item.price.currency)) {
    throw new StripeSubscriptionInvoiceValidationError();
  }

  return item.price.currency;
}

function readBillingLocale(metadata: Stripe.Metadata): BillingLocale {
  const locale = metadata.locale;

  if (locale === undefined || locale === 'en') {
    return 'en';
  }

  if (locale === 'zh-CN') {
    return locale;
  }

  throw new StripeSubscriptionInvoiceValidationError();
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

function isDeletedCustomer(
  value: Stripe.Customer | Stripe.DeletedCustomer,
): value is Stripe.DeletedCustomer {
  return 'deleted' in value && value.deleted === true;
}

function isLowercaseCurrency(value: string): boolean {
  return /^[a-z]{3}$/u.test(value);
}

function toDate(value: number): Date | null {
  if (!Number.isSafeInteger(value) || value <= 0) {
    return null;
  }

  const date = new Date(value * 1000);

  return Number.isNaN(date.getTime()) ? null : date;
}

class StripeSubscriptionInvoiceValidationError extends Error {
  override readonly name = 'StripeSubscriptionInvoiceValidationError';
}

class StripeSubscriptionInvoiceProcessingError extends Error {
  override readonly name = 'StripeSubscriptionInvoiceProcessingError';
}
