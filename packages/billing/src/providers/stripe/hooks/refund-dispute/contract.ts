import type { DatabaseTransaction } from '@repo/db/client';

export type StripeSubscriptionSnapshot = {
  readonly id: string;
  readonly customerId: string;
  readonly rawStatus: string;
  readonly status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unknown';
  readonly cancelAtPeriodEnd: boolean;
};

export type StripePurchaseContext = {
  readonly kind: 'purchase';
  readonly userId: string;
  readonly providerOrderId: string;
  readonly purchaseKind: 'lifetime' | 'credit_pack';
  readonly customerId: string;
};

export type StripeSubscriptionContext = {
  readonly kind: 'subscription';
  readonly providerOrderId: string;
  readonly customerId: string;
  readonly subscription: StripeSubscriptionSnapshot;
};

export type StripePaymentContext = StripePurchaseContext | StripeSubscriptionContext;

export type StripeRefundResolution =
  | { readonly kind: 'ignored' }
  | ((StripePurchaseContext | StripeSubscriptionContext) & {
      readonly operation: 'refund';
      readonly refundId: string;
      readonly amount: number;
      readonly currency: string;
      readonly status: 'refunded' | 'partially_refunded';
    });

export type StripeDisputeResolution =
  | { readonly kind: 'ignored' }
  | ((StripePurchaseContext | StripeSubscriptionContext) & {
      readonly operation: 'dispute';
      readonly disputeId: string;
      readonly amount: number;
      readonly currency: string;
      readonly outcome: 'active' | 'lost' | 'won';
    });

export type StripeRefundDisputeResolution = StripeRefundResolution | StripeDisputeResolution;

export type StripeRefundDisputeApplyResolution =
  | (StripePurchaseContext & {
      readonly operation: 'refund';
      readonly referenceId: string;
      readonly amount: number;
      readonly currency: string;
      readonly status: 'refunded' | 'partially_refunded';
    })
  | (StripePurchaseContext & {
      readonly operation: 'dispute';
      readonly referenceId: string;
      readonly amount: number;
      readonly currency: string;
      readonly outcome: 'active' | 'lost' | 'won';
    });

export type StripeRefundDisputeApply = (
  transaction: DatabaseTransaction,
  resolution: StripeRefundDisputeApplyResolution,
) => Promise<void>;
