import type { WebhookOrderPaidPayload } from '@polar-sh/sdk/models/components/webhookorderpaidpayload.js';
import type { WebhookSubscriptionPastDuePayload } from '@polar-sh/sdk/models/components/webhooksubscriptionpastduepayload.js';

import { billingCatalog } from '#billing-config/index';
import type { BillingLocale, SubscriptionPlan } from '#types';

import { PolarSubscriptionValidationError } from './contracts';

type SubscriptionMetadata = WebhookSubscriptionPastDuePayload['data']['metadata'];

export function assertSubscriptionMetadata(
  metadata: SubscriptionMetadata,
  plan: SubscriptionPlan,
  userId: string,
  expectedProductId: string,
  expectedPriceId: string | undefined,
): void {
  if (
    getMetadataString(metadata, 'userId') !== userId ||
    getMetadataString(metadata, 'planId') !== plan.id ||
    getMetadataString(metadata, 'purchaseKind') !== 'subscription' ||
    getMetadataString(metadata, 'productId') !== expectedProductId ||
    getMetadataString(metadata, 'referenceId') !== userId
  ) {
    throw new PolarSubscriptionValidationError();
  }

  assertPriceMetadata(metadata, expectedPriceId);
}

export function assertPriceMetadata(
  metadata: WebhookOrderPaidPayload['data']['metadata'],
  expectedPriceId: string | undefined,
): void {
  const priceId = getMetadataString(metadata, 'priceId');

  if (expectedPriceId && priceId !== expectedPriceId) {
    throw new PolarSubscriptionValidationError();
  }

  if (!expectedPriceId && priceId !== null) {
    throw new PolarSubscriptionValidationError();
  }
}

export function getMetadataString(
  metadata: { readonly [key: string]: unknown },
  key: string,
): string | null {
  const value = metadata[key];

  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function isKnownSubscriptionProduct(productId: string | null): boolean {
  if (!productId) {
    return false;
  }

  return billingCatalog.plans.some(
    (plan) => plan.kind === 'subscription' && plan.providers.polar?.productId === productId,
  );
}

export function readBillingLocale(metadata: { readonly [key: string]: unknown }): BillingLocale {
  const locale = getMetadataString(metadata, 'locale');

  if (locale === null || locale === 'en') {
    return 'en';
  }

  if (locale === 'zh-CN') {
    return locale;
  }

  throw new PolarSubscriptionValidationError();
}

export function requireNonEmptyId(value: string): string {
  if (value.length === 0) {
    throw new PolarSubscriptionValidationError();
  }

  return value;
}

export function isValidAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function isLowercaseCurrency(value: string): boolean {
  return /^[a-z]{3}$/u.test(value);
}

export function isValidDate(value: Date): boolean {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
