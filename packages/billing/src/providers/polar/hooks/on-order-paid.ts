import type { WebhookOrderPaidPayload } from '@polar-sh/sdk/models/components/webhookorderpaidpayload.js';
import { getBillingUser } from '@repo/db/queries/billing';

import { getCatalogPlan } from '#billing-config/index';
import { getPolarProductId } from '#internal/catalog-pricing';
import {
  type PurchaseEventResolution,
  processPurchaseEvent,
} from '#internal/process-purchase-event';
import type { CatalogPlan } from '#types';

const lifetimePlanId = 'lifetime';
const creditPackPlanId = 'credit-pack-100';
const lifetimePurchaseKind = 'lifetime';
const creditPackPurchaseKind = 'credit-package';
const processingErrorCode = 'one_time_order_processing_failed';
const processingErrorMessage = 'One-time order processing failed.';

type OneTimePlan = Extract<CatalogPlan, { readonly kind: 'lifetime' | 'credit-package' }>;

/**
 * Handles the official Polar `order.paid` callback after Better Auth verifies
 * its Standard Webhooks signature. All order identities are recorded with an
 * order-scoped key because this callback does not expose `webhook-id`.
 */
export async function handlePolarOrderPaid(payload: WebhookOrderPaidPayload): Promise<void> {
  const order = payload.data;

  await processPurchaseEvent({
    identity: {
      provider: 'polar',
      providerEventId: `order.paid:${order.id}`,
      eventType: 'order.paid',
    },
    resolve: async () => resolvePolarPurchase(order),
    failure: {
      code: processingErrorCode,
      message: processingErrorMessage,
    },
  });
}

async function resolvePolarPurchase(
  order: WebhookOrderPaidPayload['data'],
): Promise<PurchaseEventResolution> {
  const plan = resolveOneTimePlan(order.metadata);
  const candidateProductIds = getOneTimeProductIds();

  if (!plan && (!order.productId || !candidateProductIds.has(order.productId))) {
    return { kind: 'ignored' };
  }

  if (!plan) {
    throw new PolarOneTimeValidationError();
  }

  const expectedProductId = getPolarProductId(plan.id);
  const {
    userId,
    checkoutId,
    credits: checkoutCredits,
  } = requireOneTimeOrder(order, plan, expectedProductId);
  const user = await getBillingUser(userId);

  if (!user) {
    throw new PolarOneTimeValidationError();
  }

  return {
    kind: 'paid',
    purchase: {
      userId,
      provider: 'polar',
      providerOrderId: order.id,
      providerCheckoutId: checkoutId,
      productId: expectedProductId,
      planId: plan.id,
      kind: plan.kind === 'credit-package' ? 'credit_pack' : 'lifetime',
      status: 'paid',
      amount: order.totalAmount,
      currency: order.currency,
      purchasedAt: order.createdAt,
    },
    ...(checkoutCredits !== undefined
      ? {
          creditGrant: {
            amount: checkoutCredits,
            description: `Credit pack purchase (${checkoutCredits} credits)`,
          },
        }
      : {}),
  };
}

function resolveOneTimePlan(
  metadata: WebhookOrderPaidPayload['data']['metadata'],
): OneTimePlan | null {
  const planId = getMetadataString(metadata, 'planId');
  const purchaseKind = getMetadataString(metadata, 'purchaseKind');

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

function getOneTimeProductIds(): ReadonlySet<string> {
  return new Set([getPolarProductId(lifetimePlanId), getPolarProductId(creditPackPlanId)]);
}

function requireOneTimeOrder(
  order: WebhookOrderPaidPayload['data'],
  plan: OneTimePlan,
  expectedProductId: string,
): { readonly userId: string; readonly checkoutId: string; readonly credits: number | undefined } {
  const userId = getMetadataString(order.metadata, 'userId');
  const metadataProductId = getMetadataString(order.metadata, 'productId');
  const checkoutId = order.checkoutId;

  if (
    !userId ||
    getMetadataString(order.metadata, 'planId') !== plan.id ||
    getMetadataString(order.metadata, 'purchaseKind') !== plan.kind ||
    metadataProductId !== expectedProductId ||
    order.productId !== expectedProductId ||
    order.customer.externalId !== userId ||
    order.paid !== true ||
    order.status !== 'paid' ||
    order.billingReason !== 'purchase' ||
    order.subscriptionId !== null ||
    !isNonEmptyString(order.id) ||
    !isNonEmptyString(checkoutId) ||
    (order.product !== null &&
      (order.product.id !== expectedProductId || order.product.isRecurring !== false)) ||
    !Number.isSafeInteger(order.totalAmount) ||
    order.totalAmount <= 0 ||
    !isLowercaseCurrency(order.currency) ||
    !isValidDate(order.createdAt)
  ) {
    throw new PolarOneTimeValidationError();
  }

  const credits = readCreditMetadata(order.metadata, plan);

  return { userId, checkoutId, credits };
}

function readCreditMetadata(
  metadata: WebhookOrderPaidPayload['data']['metadata'],
  plan: OneTimePlan,
): number | undefined {
  if (plan.kind === 'lifetime') {
    if (getMetadataString(metadata, 'credits') !== null) {
      throw new PolarOneTimeValidationError();
    }

    return undefined;
  }

  const rawCredits = getMetadataString(metadata, 'credits');

  if (!rawCredits || !/^[1-9][0-9]*$/u.test(rawCredits)) {
    throw new PolarOneTimeValidationError();
  }

  const credits = Number(rawCredits);

  if (!Number.isSafeInteger(credits) || credits <= 0) {
    throw new PolarOneTimeValidationError();
  }

  return credits;
}

function getMetadataString(
  metadata: WebhookOrderPaidPayload['data']['metadata'],
  key: string,
): string | null {
  const value = metadata[key];

  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isNonEmptyString(value: string | null): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isLowercaseCurrency(value: string): boolean {
  return /^[a-z]{3}$/u.test(value);
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

class PolarOneTimeValidationError extends Error {
  override readonly name = 'PolarOneTimeValidationError';
}
