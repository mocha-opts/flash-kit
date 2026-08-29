import type { BillingNotification } from '#types';

export type SubscriptionNotificationResolution =
  | { readonly kind: 'ignored' }
  | { readonly kind: 'notify'; readonly notification: BillingNotification };

export class PolarSubscriptionValidationError extends Error {
  override readonly name = 'PolarSubscriptionValidationError';
}

export class PolarSubscriptionProcessingError extends Error {
  override readonly name = 'PolarSubscriptionProcessingError';
}
