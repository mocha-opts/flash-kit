import type { WebhookOrderRefundedPayload } from '@polar-sh/sdk/models/components/webhookorderrefundedpayload.js';
import type { WebhookRefundCreatedPayload } from '@polar-sh/sdk/models/components/webhookrefundcreatedpayload.js';
import type { WebhookRefundUpdatedPayload } from '@polar-sh/sdk/models/components/webhookrefundupdatedpayload.js';

export type PolarRefundEventType = 'order.refunded' | 'refund.created' | 'refund.updated';

export type PolarDisputeStatus = 'active' | 'lost' | 'won';

export type PolarSubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused'
  | 'unknown';

/**
 * Provider-neutral facts emitted by Polar's refund/dispute webhooks.
 *
 * `providerOrderId` is the only purchase association key. The core processor
 * must resolve it against the local provider/order unique index; metadata and
 * customer ids are validation evidence, never an authorization shortcut.
 */
export type PolarRefundEventResolution =
  | {
      readonly kind: 'ignored';
      readonly reason:
        | 'not_actionable'
        | 'refund_not_succeeded'
        | 'dispute_prevented_without_refund';
    }
  | {
      readonly kind: 'refund';
      readonly provider: 'polar';
      /** Trusted only after one-time Order metadata is validated. Null for subscriptions. */
      readonly userId: string | null;
      readonly providerOrderId: string;
      readonly providerRefundId: string | null;
      readonly providerSubscriptionId: string | null;
      /** Actual provider status when the order payload includes a subscription. */
      readonly subscriptionStatus: PolarSubscriptionStatus | null;
      readonly status: 'refunded' | 'partially_refunded';
      /** Provider's net refunded amount, in the smallest currency unit. */
      readonly amount: number;
      /** Provider's refunded tax amount, in the smallest currency unit. */
      readonly taxAmount: number;
      readonly currency: string;
      /** Stable provider-facing reference used by the core credit ledger. */
      readonly referenceId: string;
      readonly occurredAt: Date;
    }
  | {
      readonly kind: 'dispute';
      readonly provider: 'polar';
      /** Trusted only after one-time Order metadata is validated. Null for subscriptions. */
      readonly userId: string | null;
      readonly providerOrderId: string;
      readonly providerRefundId: string;
      readonly providerSubscriptionId: string | null;
      /** Refund payloads do not embed the subscription snapshot. */
      readonly subscriptionStatus: PolarSubscriptionStatus | null;
      readonly disputeId: string;
      readonly status: PolarDisputeStatus;
      /** Provider's disputed amount, in the smallest currency unit. */
      readonly amount: number;
      readonly taxAmount: number;
      readonly currency: string;
      /** Stable provider-facing reference used by the core event processor. */
      readonly referenceId: string;
      readonly occurredAt: Date;
    };

export type PolarRefundEventIdentity = {
  readonly provider: 'polar';
  readonly providerEventId: string;
  readonly eventType: PolarRefundEventType;
};

export type PolarRefundEventProcessorInput = {
  readonly identity: PolarRefundEventIdentity;
  readonly resolve: () => Promise<PolarRefundEventResolution>;
  readonly failure: {
    readonly code: string;
    readonly message: string;
  };
};

/**
 * Core refund/dispute orchestration seam. The core owns billing_event
 * idempotency, local Purchase lookup, credit compensation, and transaction
 * boundaries; this provider module owns only validation and normalization.
 */
export type PolarRefundEventProcessor = (input: PolarRefundEventProcessorInput) => Promise<void>;

export type PolarRefundEventHandlers = {
  readonly onOrderRefunded: (payload: WebhookOrderRefundedPayload) => Promise<void>;
  readonly onRefundCreated: (payload: WebhookRefundCreatedPayload) => Promise<void>;
  readonly onRefundUpdated: (payload: WebhookRefundUpdatedPayload) => Promise<void>;
};
