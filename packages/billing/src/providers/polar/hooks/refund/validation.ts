import type { Subscription } from '@polar-sh/sdk/models/components/subscription.js';
import type { WebhookOrderRefundedPayload } from '@polar-sh/sdk/models/components/webhookorderrefundedpayload.js';
import type { WebhookRefundCreatedPayload } from '@polar-sh/sdk/models/components/webhookrefundcreatedpayload.js';

import { getPolarProductId } from '#internal/catalog-pricing';

import type { PolarDisputeStatus, PolarSubscriptionStatus } from './contracts';

const MAX_POSTGRES_INTEGER = 2_147_483_647;
const lifetimePlanId = 'lifetime';
const creditPackPlanId = 'credit-pack-100';
const lifetimePurchaseKind = 'lifetime';
const creditPackPurchaseKind = 'credit-package';
const activeDisputeStatuses = new Set(['early_warning', 'needs_response', 'under_review']);

export function validateRefund(
  refund: WebhookRefundCreatedPayload['data'],
  eventTimestamp: Date,
): void {
  if (
    !isNonEmptyString(refund.id) ||
    !isNonEmptyString(refund.orderId) ||
    !isNonEmptyString(refund.customerId) ||
    !isNonEmptyString(refund.organizationId) ||
    !isValidDate(refund.createdAt) ||
    !isValidDate(eventTimestamp) ||
    (refund.modifiedAt !== null && !isValidDate(refund.modifiedAt)) ||
    !isPositiveInteger(refund.amount) ||
    !isNonNegativeInteger(refund.taxAmount) ||
    !isLowercaseCurrency(refund.currency) ||
    (refund.subscriptionId !== null && !isNonEmptyString(refund.subscriptionId))
  ) {
    throw new PolarRefundValidationError();
  }
}

export function validateDispute(
  dispute: NonNullable<WebhookRefundCreatedPayload['data']['dispute']>,
  refund: WebhookRefundCreatedPayload['data'],
): void {
  if (
    !isNonEmptyString(dispute.id) ||
    !isNonEmptyString(dispute.orderId) ||
    !isNonEmptyString(dispute.paymentId) ||
    dispute.orderId !== refund.orderId ||
    !isValidDate(dispute.createdAt) ||
    (dispute.modifiedAt !== null && !isValidDate(dispute.modifiedAt)) ||
    !isPositiveInteger(dispute.amount) ||
    !isNonNegativeInteger(dispute.taxAmount) ||
    !isLowercaseCurrency(dispute.currency) ||
    dispute.currency !== refund.currency ||
    !isKnownDisputeStatus(dispute.status)
  ) {
    throw new PolarRefundValidationError();
  }
}

export function validateOrderRefund(
  order: WebhookOrderRefundedPayload['data'],
  eventTimestamp: Date,
): 'refunded' | 'partially_refunded' {
  if (
    !isNonEmptyString(order.id) ||
    !isValidDate(order.createdAt) ||
    (order.modifiedAt !== null && !isValidDate(order.modifiedAt)) ||
    !isValidDate(eventTimestamp) ||
    order.paid !== true ||
    (order.status !== 'refunded' && order.status !== 'partially_refunded') ||
    !isNonNegativeInteger(order.subtotalAmount) ||
    !isNonNegativeInteger(order.discountAmount) ||
    !isNonNegativeInteger(order.netAmount) ||
    !isNonNegativeInteger(order.taxAmount) ||
    !isPositiveInteger(order.totalAmount) ||
    !isNonNegativeInteger(order.refundedAmount) ||
    !isNonNegativeInteger(order.refundedTaxAmount) ||
    order.discountAmount > order.subtotalAmount ||
    order.netAmount + order.taxAmount !== order.totalAmount ||
    order.refundedAmount > order.netAmount ||
    order.refundedTaxAmount > order.taxAmount ||
    !isLowercaseCurrency(order.currency) ||
    order.refundedAmount + order.refundedTaxAmount <= 0 ||
    order.refundedAmount + order.refundedTaxAmount > order.totalAmount ||
    (order.status === 'refunded' &&
      order.refundedAmount + order.refundedTaxAmount !== order.totalAmount) ||
    (order.status === 'partially_refunded' &&
      order.refundedAmount + order.refundedTaxAmount >= order.totalAmount) ||
    order.productId === null ||
    !isNonEmptyString(order.productId) ||
    order.customerId !== order.customer.id ||
    !isNonEmptyString(order.customer.id)
  ) {
    throw new PolarRefundValidationError();
  }

  if (order.subscriptionId === null) {
    if (
      order.billingReason !== 'purchase' ||
      order.product?.isRecurring === true ||
      order.subscription !== null
    ) {
      throw new PolarRefundValidationError();
    }
  } else if (
    !isNonEmptyString(order.subscriptionId) ||
    order.billingReason === 'purchase' ||
    order.product?.isRecurring === false ||
    (order.subscription !== null &&
      (order.subscription.id !== order.subscriptionId ||
        order.subscription.customerId !== order.customer.id ||
        order.subscription.productId !== order.productId ||
        order.subscription.currency !== order.currency))
  ) {
    throw new PolarRefundValidationError();
  }

  if (order.product && order.product.id !== order.productId) {
    throw new PolarRefundValidationError();
  }

  if (order.subscription && toPolarSubscriptionStatus(order.subscription.status) === 'unknown') {
    throw new PolarRefundValidationError();
  }

  return order.status === 'refunded' ? 'refunded' : 'partially_refunded';
}

export function requireOneTimeOrderMetadata(order: WebhookOrderRefundedPayload['data']): string {
  const userId = getMetadataString(order.metadata, 'userId');
  const metadataProductId = getMetadataString(order.metadata, 'productId');
  const planId = getMetadataString(order.metadata, 'planId');
  const purchaseKind = getMetadataString(order.metadata, 'purchaseKind');
  const expectedProductId =
    planId === lifetimePlanId || planId === creditPackPlanId
      ? getExpectedPolarProductId(planId)
      : null;

  if (
    !isNonEmptyString(userId) ||
    !isNonEmptyString(metadataProductId) ||
    !isNonEmptyString(planId) ||
    !isNonEmptyString(purchaseKind) ||
    expectedProductId === null ||
    metadataProductId !== expectedProductId ||
    order.productId !== expectedProductId ||
    order.customer.externalId !== userId ||
    (planId === lifetimePlanId && purchaseKind !== lifetimePurchaseKind) ||
    (planId === creditPackPlanId && purchaseKind !== creditPackPurchaseKind) ||
    order.billingReason !== 'purchase' ||
    order.subscriptionId !== null ||
    order.product?.isRecurring === true ||
    !isNonEmptyString(order.checkoutId)
  ) {
    throw new PolarRefundValidationError();
  }

  return userId;
}

export function validateRefundOrderAssociation(
  refund: WebhookRefundCreatedPayload['data'],
  order: WebhookOrderRefundedPayload['data'],
): void {
  if (
    order.id !== refund.orderId ||
    order.customerId !== refund.customerId ||
    order.customer.id !== refund.customerId ||
    order.customer.organizationId !== refund.organizationId ||
    order.currency !== refund.currency ||
    order.subscriptionId !== refund.subscriptionId
  ) {
    throw new PolarRefundValidationError();
  }
}

export function validateSubscriptionAssociation(
  subscription: Subscription,
  order: WebhookOrderRefundedPayload['data'],
  association: {
    readonly customerId: string;
    readonly orderId: string;
    readonly subscriptionId: string;
    readonly currency: string;
  },
): PolarSubscriptionStatus {
  const status = toPolarSubscriptionStatus(subscription.status);

  if (
    !isNonEmptyString(subscription.id) ||
    !isValidDate(subscription.createdAt) ||
    (subscription.modifiedAt !== null && !isValidDate(subscription.modifiedAt)) ||
    !isNonEmptyString(subscription.customerId) ||
    !isNonEmptyString(subscription.productId) ||
    !isLowercaseCurrency(subscription.currency) ||
    !isValidDate(subscription.currentPeriodStart) ||
    !isValidDate(subscription.currentPeriodEnd) ||
    status === 'unknown' ||
    subscription.id !== association.subscriptionId ||
    order.id !== association.orderId ||
    order.subscriptionId !== association.subscriptionId ||
    subscription.customerId !== association.customerId ||
    subscription.customer.id !== association.customerId ||
    order.customerId !== association.customerId ||
    order.customer.id !== association.customerId ||
    subscription.productId !== order.productId ||
    subscription.currency !== association.currency ||
    subscription.currency !== order.currency ||
    subscription.customer.organizationId !== order.customer.organizationId
  ) {
    throw new PolarRefundValidationError();
  }

  return status;
}

export function toProviderNeutralDisputeStatus(status: string): PolarDisputeStatus {
  if (status === 'lost') {
    return 'lost';
  }

  if (status === 'won') {
    return 'won';
  }

  if (activeDisputeStatuses.has(status)) {
    return 'active';
  }

  throw new PolarRefundValidationError();
}

function getExpectedPolarProductId(planId: string): string | null {
  if (planId !== lifetimePlanId && planId !== creditPackPlanId) {
    return null;
  }

  try {
    return getPolarProductId(planId);
  } catch {
    throw new PolarRefundValidationError();
  }
}

function toPolarSubscriptionStatus(status: string): PolarSubscriptionStatus {
  switch (status) {
    case 'incomplete':
    case 'incomplete_expired':
    case 'trialing':
    case 'active':
    case 'past_due':
    case 'canceled':
    case 'unpaid':
    case 'paused':
      return status;
    default:
      return 'unknown';
  }
}

function isKnownDisputeStatus(status: string): boolean {
  return (
    status === 'prevented' ||
    status === 'lost' ||
    status === 'won' ||
    activeDisputeStatuses.has(status)
  );
}

function getMetadataString(
  metadata: WebhookOrderRefundedPayload['data']['metadata'],
  key: string,
): string | null {
  const value = metadata[key];

  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && value <= MAX_POSTGRES_INTEGER;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_POSTGRES_INTEGER;
}

function isLowercaseCurrency(value: string): boolean {
  return /^[a-z]{3}$/u.test(value);
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export class PolarRefundValidationError extends Error {
  override readonly name = 'PolarRefundValidationError';
}
