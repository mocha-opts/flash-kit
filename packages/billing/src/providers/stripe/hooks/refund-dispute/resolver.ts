import 'server-only';

import type Stripe from 'stripe';

import { createStripeClient } from '#providers/stripe/stripe-client';
import type { StripeDisputeResolution, StripeRefundResolution } from './contract';
import {
  resolveCharge,
  resolvePaymentIntent,
  resolveStripePaymentContext,
} from './payment-association';
import {
  assertPaymentAmountAndCurrency,
  requireCurrency,
  requireNonNegativeInteger,
  requirePositiveInteger,
  requireStripeId,
  resolveRefundStatus,
  StripeRefundDisputeValidationError,
  stripeChargeIdPattern,
  stripeDisputeIdPattern,
  stripeRefundIdPattern,
} from './validation';

const activeDisputeStatuses = new Set([
  'warning_needs_response',
  'warning_under_review',
  'needs_response',
  'under_review',
]);
const lostDisputeStatuses = new Set(['lost']);
const wonDisputeStatuses = new Set(['won']);
const closedDisputeStatuses = new Set(['warning_closed', 'prevented']);
const knownDisputeStatuses = new Set([
  ...activeDisputeStatuses,
  ...lostDisputeStatuses,
  ...wonDisputeStatuses,
  ...closedDisputeStatuses,
]);

/** Resolves a Stripe Refund object into provider-neutral, trusted facts. */
export async function resolveStripeRefund(event: Stripe.Event): Promise<StripeRefundResolution> {
  const client = createStripeClient();
  const eventType = event.type;

  if (eventType === 'refund.failed') {
    requireStripeId(event.data.object, 'refund', stripeRefundIdPattern);
    return { kind: 'ignored' };
  }

  if (eventType === 'charge.refunded') {
    const chargeId = requireStripeId(event.data.object, 'charge', stripeChargeIdPattern);
    const charge = await client.charges.retrieve(chargeId, {
      expand: ['payment_intent'],
    });

    if (charge.object !== 'charge' || charge.id !== chargeId) {
      throw new StripeRefundDisputeValidationError('Stripe returned an invalid Charge.');
    }

    if (!charge.refunded) {
      return { kind: 'ignored' };
    }

    const amount = requirePositiveInteger(charge.amount_refunded, 'charge refund amount');
    const currency = requireCurrency(charge.currency);
    const chargeAmount = requirePositiveInteger(
      charge.amount_captured > 0 ? charge.amount_captured : charge.amount,
      'charge captured amount',
    );
    const status = resolveRefundStatus(amount, chargeAmount, charge.refunded);
    const paymentIntent = await resolvePaymentIntent(client, charge.payment_intent);
    assertPaymentAmountAndCurrency(paymentIntent, amount, currency);
    const context = await resolveStripePaymentContext(client, paymentIntent);

    if (!context) {
      return { kind: 'ignored' };
    }

    return {
      ...context,
      operation: 'refund',
      refundId: charge.id,
      amount,
      currency,
      status,
    };
  }

  const refundId = requireStripeId(event.data.object, 'refund', stripeRefundIdPattern);
  const refund = await client.refunds.retrieve(refundId, {
    expand: ['payment_intent', 'charge', 'charge.payment_intent'],
  });

  if (refund.status !== 'succeeded') {
    if (
      refund.status === 'pending' ||
      refund.status === 'requires_action' ||
      refund.status === 'failed' ||
      refund.status === 'canceled'
    ) {
      return { kind: 'ignored' };
    }

    throw new StripeRefundDisputeValidationError('Stripe returned an unknown refund status.');
  }

  const amount = requirePositiveInteger(refund.amount, 'refund amount');
  const currency = requireCurrency(refund.currency);
  const charge = await resolveCharge(client, refund.charge, refund.payment_intent);
  const paymentIntent = await resolvePaymentIntent(
    client,
    refund.payment_intent ?? charge?.payment_intent ?? null,
  );
  const originalAmount = requirePositiveInteger(
    paymentIntent.amount_received,
    'PaymentIntent received amount',
  );
  assertPaymentAmountAndCurrency(paymentIntent, amount, currency);
  const totalRefunded = charge
    ? requireNonNegativeInteger(charge.amount_refunded, 'charge refunded amount')
    : amount;
  const chargeAmount = charge
    ? requirePositiveInteger(
        charge.amount_captured > 0 ? charge.amount_captured : charge.amount,
        'charge captured amount',
      )
    : originalAmount;

  if (totalRefunded < amount || totalRefunded > chargeAmount) {
    throw new StripeRefundDisputeValidationError('Stripe refund totals are inconsistent.');
  }

  const status = resolveRefundStatus(totalRefunded, chargeAmount, charge?.refunded ?? false);
  const context = await resolveStripePaymentContext(client, paymentIntent);

  if (!context) {
    return { kind: 'ignored' };
  }

  return {
    ...context,
    operation: 'refund',
    refundId,
    amount,
    currency,
    status,
  };
}

/** Resolves a Stripe Dispute object into provider-neutral, trusted facts. */
export async function resolveStripeDispute(event: Stripe.Event): Promise<StripeDisputeResolution> {
  const eventType = event.type;
  const disputeId = requireStripeId(event.data.object, 'dispute', stripeDisputeIdPattern);
  const client = createStripeClient();
  const dispute = await client.disputes.retrieve(disputeId, {
    expand: ['payment_intent', 'charge', 'charge.payment_intent'],
  });

  if (!knownDisputeStatuses.has(dispute.status)) {
    throw new StripeRefundDisputeValidationError('Stripe returned an unknown dispute status.');
  }

  const fundsReinstated = eventType === 'charge.dispute.funds_reinstated';

  if (!fundsReinstated && closedDisputeStatuses.has(dispute.status)) {
    return { kind: 'ignored' };
  }

  const outcome =
    fundsReinstated || wonDisputeStatuses.has(dispute.status)
      ? 'won'
      : lostDisputeStatuses.has(dispute.status)
        ? 'lost'
        : 'active';

  const amount = requirePositiveInteger(dispute.amount, 'dispute amount');
  const currency = requireCurrency(dispute.currency);
  const charge = await resolveCharge(client, dispute.charge, dispute.payment_intent);
  const paymentIntent = await resolvePaymentIntent(
    client,
    dispute.payment_intent ?? charge?.payment_intent ?? null,
  );
  assertPaymentAmountAndCurrency(paymentIntent, amount, currency);
  const context = await resolveStripePaymentContext(client, paymentIntent);

  if (!context) {
    return { kind: 'ignored' };
  }

  return {
    ...context,
    operation: 'dispute',
    disputeId,
    amount,
    currency,
    outcome,
  };
}
