import type Stripe from 'stripe';

const stripeIdPattern = /^[a-z]+_[A-Za-z0-9]+$/u;
const stripeCustomerIdPattern = /^cus_[A-Za-z0-9]+$/u;
export const stripePaymentIntentIdPattern = /^pi_[A-Za-z0-9]+$/u;
export const stripeRefundIdPattern = /^re_[A-Za-z0-9]+$/u;
export const stripeDisputeIdPattern = /^dp_[A-Za-z0-9]+$/u;
export const stripeChargeIdPattern = /^ch_[A-Za-z0-9]+$/u;
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const currencyPattern = /^[a-z]{3}$/u;

export function assertPaymentAmountAndCurrency(
  paymentIntent: Stripe.PaymentIntent,
  amount: number,
  currency: string,
): void {
  if (paymentIntent.currency !== currency || amount > paymentIntent.amount_received) {
    throw new StripeRefundDisputeValidationError(
      'Stripe refund/dispute amount or currency does not match the PaymentIntent.',
    );
  }
}

export function resolveRefundStatus(
  totalRefunded: number,
  chargeAmount: number,
  chargeRefunded: boolean,
): 'refunded' | 'partially_refunded' {
  if (totalRefunded > chargeAmount || (chargeRefunded && totalRefunded !== chargeAmount)) {
    throw new StripeRefundDisputeValidationError('Stripe refund totals are inconsistent.');
  }

  return chargeRefunded || totalRefunded === chargeAmount ? 'refunded' : 'partially_refunded';
}

export function requireStripeId(value: unknown, label: string, pattern: RegExp): string {
  const id = getStripeObjectId(value);

  if (!id || !pattern.test(id)) {
    throw new StripeRefundDisputeValidationError(`Stripe ${label} id is invalid.`);
  }

  return id;
}

export function requireStripeCustomerId(value: unknown): string {
  const id = getStripeObjectId(value);

  if (!id || !stripeCustomerIdPattern.test(id)) {
    throw new StripeRefundDisputeValidationError('Stripe event has no valid Customer id.');
  }

  return id;
}

export function requirePrefixedString(value: string, prefix: string): string {
  if (!value.startsWith(prefix) || !stripeIdPattern.test(value)) {
    throw new StripeRefundDisputeValidationError('Stripe returned an invalid related id.');
  }

  return value;
}

export function requirePositiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new StripeRefundDisputeValidationError(`Stripe ${label} must be a positive integer.`);
  }

  return value;
}

export function requireNonNegativeInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new StripeRefundDisputeValidationError(`Stripe ${label} must be a non-negative integer.`);
  }

  return value;
}

export function requireCurrency(value: string): string {
  if (!currencyPattern.test(value)) {
    throw new StripeRefundDisputeValidationError('Stripe currency must be lowercase ISO-4217.');
  }

  return value;
}

export function isNonEmpty(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

export function getStripeObjectId(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value !== 'object' || value === null || !('id' in value)) {
    return null;
  }

  return typeof value.id === 'string' ? value.id : null;
}

export function readStripeRecord(value: unknown, key: string): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || !(key in value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const candidate = record[key];

  return typeof candidate === 'object' && candidate !== null
    ? (candidate as Record<string, unknown>)
    : null;
}

export function readStripeString(value: unknown, key: string): string | null {
  if (typeof value !== 'object' || value === null || !(key in value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return typeof record[key] === 'string' ? record[key] : null;
}

export function readStripeObjectId(value: unknown, key: string): string | null {
  if (typeof value !== 'object' || value === null || !(key in value)) {
    return null;
  }

  const record = value as Record<string, unknown>;

  return getStripeObjectId(record[key]);
}

export class StripeRefundDisputeValidationError extends Error {
  override readonly name = 'StripeRefundDisputeValidationError';
}
