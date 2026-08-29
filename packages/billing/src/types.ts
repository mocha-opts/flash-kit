/** Provider identifiers kept independent from provider SDK response types. */
export type BillingProvider = 'stripe' | 'polar';

/** Catalog plan kinds; each kind has stable product semantics. */
export type BillingPlanKind = 'free' | 'subscription' | 'lifetime' | 'credit-package';

/**
 * A stable feature identifier; localized labels belong to the consuming app.
 *
 * Catalogs normally use the object form so future metadata can be added
 * without changing the plan shape. The string form remains valid for the
 * provider-neutral contract described by the architecture docs.
 */
export type BillingFeature =
  | string
  | {
      readonly id: string;
    };

/** A stable limit identifier and integer allowance; null means unlimited. */
export type BillingLimits = Readonly<Record<string, number | null>>;

/** Provider Product/Price references used by later provider integrations. */
export type CatalogProviderReference = {
  readonly productId: string;
  readonly priceId?: string | undefined;
};

/** Provider IDs are optional for unselected deployments and validated for the active one. */
export type CatalogProviderIds = Partial<
  Record<BillingProvider, CatalogProviderReference | undefined>
>;

/** Shared product semantics owned by every catalog plan. */
export type CatalogPlanBase = {
  readonly id: string;
  readonly name: string;
  readonly features: readonly BillingFeature[];
  readonly limits: BillingLimits;
};

/** Plan available without a payment provider. */
export type FreePlan = CatalogPlanBase & {
  readonly kind: 'free';
};

/** Recurring plan with a stable monthly or yearly interval. */
export type SubscriptionPlan = CatalogPlanBase & {
  readonly kind: 'subscription';
  readonly interval: 'month' | 'year';
  readonly providers: CatalogProviderIds;
  /** Display-only major currency unit; never pass this to a billing API. */
  readonly cost: number;
  readonly currency: string;
};

/** One-time plan that grants permanent product access. */
export type LifetimePlan = CatalogPlanBase & {
  readonly kind: 'lifetime';
  readonly providers: CatalogProviderIds;
  /** Display-only major currency unit; never pass this to a billing API. */
  readonly cost: number;
  readonly currency: string;
};

/** One-time plan that grants an integer number of credits. */
export type CreditPackagePlan = CatalogPlanBase & {
  readonly kind: 'credit-package';
  readonly providers: CatalogProviderIds;
  readonly credits: number;
  /** Display-only major currency unit; never pass this to a billing API. */
  readonly cost: number;
  readonly currency: string;
};

/** Provider-neutral catalog; provider references are resolved only by billing integrations. */
export type CatalogPlan = FreePlan | SubscriptionPlan | LifetimePlan | CreditPackagePlan;

/** Provider capabilities exposed to billing callers. */
export type BillingCapabilities = {
  readonly checkout: boolean;
  readonly lifetimeCheckout: boolean;
  readonly creditCheckout: boolean;
  readonly customerPortal: boolean;
  readonly cancelSubscription: boolean;
  readonly restoreSubscription: boolean;
};

/** Descriptive alias used by provider-neutral callers and architecture docs. */
export type BillingProviderCapabilities = BillingCapabilities;

/** The effective plan for a user and the source that granted it. */
export type ActivePlan = {
  readonly planId: string;
  readonly source: 'free' | 'subscription' | 'lifetime';
};

/** Supported URL locales accepted by billing redirects. */
export type BillingLocale = 'en' | 'zh-CN';

/**
 * Provider-neutral facts needed by the semantic purchase receipt sender.
 *
 * The recipient is read from the trusted Auth user record by the provider
 * adapter. Provider SDK objects, raw webhook payloads, and secrets never cross
 * this boundary.
 */
type PurchaseReceiptBillingNotificationBase = {
  readonly kind: 'purchase-receipt';
  readonly email: string;
  readonly locale: BillingLocale;
  readonly amount: number;
  readonly currency: string;
  readonly occurredAt: Date;
};

export type PurchaseReceiptBillingNotification =
  | (PurchaseReceiptBillingNotificationBase & {
      readonly purchaseKind: 'subscription';
      readonly interval: 'month' | 'year';
      readonly credits?: never;
    })
  | (PurchaseReceiptBillingNotificationBase & {
      readonly purchaseKind: 'lifetime';
      readonly interval?: never;
      readonly credits?: never;
    })
  | (PurchaseReceiptBillingNotificationBase & {
      readonly purchaseKind: 'credit-package';
      readonly interval?: never;
      readonly credits: number;
    });

/** Provider-neutral facts needed by the semantic payment-failed sender. */
export type PaymentFailedBillingNotification = {
  readonly kind: 'payment-failed';
  readonly email: string;
  readonly locale: BillingLocale;
  readonly interval: 'month' | 'year';
  readonly amount: number;
  readonly currency: string;
  readonly occurredAt: Date;
};

/** Notification facts emitted only after the corresponding Billing transaction commits. */
export type BillingNotification =
  | PurchaseReceiptBillingNotification
  | PaymentFailedBillingNotification;

/**
 * Callback supplied by the Auth composition root to dispatch semantic email
 * senders. Billing owns invocation timing and failure isolation; Auth owns the
 * concrete email package integration.
 */
export type BillingNotificationSender = (notification: BillingNotification) => Promise<void>;

/** Optional notification port for provider webhook handlers. */
export type BillingNotificationOptions = {
  readonly notificationSender?: BillingNotificationSender;
};

/** Input for a checkout request; the user id must come from an authenticated server context. */
export type CreateCheckoutInput = {
  readonly userId: string;
  readonly planId: string;
  readonly locale?: BillingLocale;
};

/** Stable checkout result; provider response objects never cross this boundary. */
export type CheckoutResult = {
  readonly url: string;
};

/** Input for a customer portal request. */
export type CreatePortalInput = {
  readonly userId: string;
  readonly locale?: BillingLocale;
};

/** Stable customer portal result; provider response objects never cross this boundary. */
export type PortalResult = {
  readonly url: string;
};

/** User-scoped input shared by subscription reads and mutations. */
export type UserBillingInput = {
  readonly userId: string;
};

/** User-scoped subscription mutation; an omitted id targets the user's active subscription. */
export type SubscriptionMutationInput = UserBillingInput & {
  readonly subscriptionId?: string;
};

/** Current credit balance scoped to the user identified by `userId`. */
export type CreditBalance = {
  readonly userId: string;
  readonly balance: number;
};

/** Read model for credit history; mutation and authorization remain server-side. */
export type CreditTransactionType = 'purchase' | 'consumption' | 'refund' | 'adjustment';

/** Minimal provider-neutral purchase summary attached to a credit transaction. */
export type CreditTransactionPurchaseSummary = {
  readonly id: string;
  readonly provider: BillingProvider;
  readonly planId: string;
  readonly amount: number;
  readonly currency: string;
  readonly purchasedAt: string;
};

/** Serializable provider-neutral credit ledger entry. */
export type CreditTransactionView = {
  readonly id: string;
  readonly type: CreditTransactionType;
  readonly amount: number;
  readonly balanceAfter: number;
  readonly description: string;
  readonly referenceType: string;
  readonly referenceId: string;
  readonly purchase: CreditTransactionPurchaseSummary | null;
  readonly createdAt: string;
};

/** Serializable page returned by the user-scoped credit history boundary. */
export type CreditTransactionsPage = {
  readonly items: readonly CreditTransactionView[];
  readonly page: number;
  readonly limit: number;
  readonly hasNext: boolean;
};

/** Query shape for the stable, user-scoped credit read boundary. */
export type CreditTransactionsInput = UserBillingInput & {
  readonly page?: number;
  readonly limit?: number;
};

/** Purchase states kept by the local one-time billing ledger. */
export type BillingPurchaseStatus = 'paid' | 'refunded' | 'partially_refunded' | 'disputed';

/** Input shared by provider-neutral refund and dispute handling. */
export type PurchaseStatusMutationInput = UserBillingInput & {
  readonly provider: BillingProvider;
  readonly providerOrderId: string;
};

/** Provider-normalized dispute outcomes accepted by the local status seam. */
export type PurchaseDisputeOutcome = 'active' | 'lost' | 'won';

/** Provider-neutral dispute input; omitted outcome keeps the active behavior. */
export type PurchaseDisputeInput = PurchaseStatusMutationInput & {
  readonly outcome?: PurchaseDisputeOutcome | undefined;
};

/** Signed refund ledger result; `amount` is always negative. */
export type CreditRefundCompensation = {
  readonly transactionId: string;
  readonly amount: number;
  readonly balanceAfter: number;
};

/** Stable result returned after a Lifetime or Credit Pack refund. */
export type PurchaseRefundResult = {
  readonly purchaseId: string;
  readonly provider: BillingProvider;
  readonly providerOrderId: string;
  readonly kind: 'lifetime' | 'credit_pack';
  readonly status: 'refunded';
  readonly changed: boolean;
  readonly creditCompensation: CreditRefundCompensation | null;
};

/** Stable result returned after a provider-confirmed partial refund. */
export type PurchasePartialRefundResult = {
  readonly purchaseId: string;
  readonly provider: BillingProvider;
  readonly providerOrderId: string;
  readonly kind: 'lifetime' | 'credit_pack';
  readonly status: 'partially_refunded' | 'refunded';
  readonly changed: boolean;
  /** Partial refunds do not automatically alter the append-only Credit ledger. */
  readonly creditCompensation: null;
};

/** Stable result returned after a Lifetime or Credit Pack dispute. */
export type PurchaseDisputeResult = {
  readonly purchaseId: string;
  readonly provider: BillingProvider;
  readonly providerOrderId: string;
  readonly kind: 'lifetime' | 'credit_pack';
  readonly status: 'paid' | 'partially_refunded' | 'disputed' | 'refunded';
  readonly changed: boolean;
  readonly outcome: PurchaseDisputeOutcome;
  /** Disputes do not compensate Credit Packs; a later full refund does. */
  readonly creditCompensation: null;
};

/** Trusted server-side input for one idempotent Credit consumption. */
export type ConsumeCreditsInput = UserBillingInput & {
  readonly amount: number;
  readonly description: string;
  readonly referenceType: string;
  readonly referenceId: string;
};

/** Provider-neutral result of a new or idempotently replayed Credit consumption. */
export type ConsumeCreditsResult = {
  readonly status: 'consumed' | 'already_consumed';
  readonly transactionId: string;
  readonly amount: number;
  readonly balanceAfter: number;
};

/** Provider-neutral subscription status normalized for application use. */
export type BillingSubscription = {
  readonly id: string;
  readonly provider: BillingProvider;
  readonly planId: string;
  readonly status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unknown';
  readonly interval?: 'month' | 'year' | undefined;
  readonly periodStart?: string | undefined;
  readonly periodEnd?: string | undefined;
  readonly cancelAtPeriodEnd: boolean;
};

/** Explicit provider/API failure; callers must render Billing unavailable, never Free. */
export class BillingUnavailableError extends Error {
  override readonly name = 'BillingUnavailableError';

  constructor(message = 'The billing provider is currently unavailable.') {
    super(message);
  }
}

/** Checkout requires a user whose email has already been verified. */
export class BillingEmailVerificationRequiredError extends Error {
  override readonly name = 'BillingEmailVerificationRequiredError';

  constructor(message = 'Email verification is required before starting checkout.') {
    super(message);
  }
}

/** Prevents a second checkout while the same customer already has a subscription. */
export class ActiveSubscriptionExistsError extends Error {
  override readonly name = 'ActiveSubscriptionExistsError';

  constructor(message = 'The user already has an active or trialing subscription.') {
    super(message);
  }
}

/** Prevents another Lifetime checkout after a paid Lifetime purchase exists. */
export class LifetimePurchaseExistsError extends Error {
  override readonly name = 'LifetimePurchaseExistsError';

  constructor(message = 'The user already owns a Lifetime purchase.') {
    super(message);
  }
}

/** A normal Credit consumption cannot make the current balance negative. */
export class InsufficientCreditsError extends Error {
  override readonly name = 'InsufficientCreditsError';

  constructor(
    readonly required: number,
    readonly available: number,
    message = 'The credit balance is insufficient for this request.',
  ) {
    super(message);
  }
}

/** The same idempotency reference cannot describe two different consumptions. */
export class CreditConsumptionConflictError extends Error {
  override readonly name = 'CreditConsumptionConflictError';

  constructor(message = 'The credit consumption reference is already in use.') {
    super(message);
  }
}

/** The provider order is not present in the local Purchase ledger. */
export class BillingPurchaseNotFoundError extends Error {
  override readonly name = 'BillingPurchaseNotFoundError';

  constructor(message = 'The billing purchase was not found.') {
    super(message);
  }
}

/** A refund/dispute could not safely apply to the current Purchase state. */
export class BillingPurchaseStatusConflictError extends Error {
  override readonly name = 'BillingPurchaseStatusConflictError';

  constructor(
    message = 'The billing purchase status transition conflicts with its current state.',
  ) {
    super(message);
  }
}

/** A Credit Pack has no immutable historical grant to reverse. */
export class BillingPurchaseCreditGrantMissingError extends Error {
  override readonly name = 'BillingPurchaseCreditGrantMissingError';

  constructor(message = 'The Credit Pack purchase grant was not found.') {
    super(message);
  }
}

/** Minimal server billing client boundary; provider SDK clients stay private. */
export type BillingClient = {
  readonly provider: BillingProvider;
  readonly capabilities: BillingCapabilities;
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
  createPortal(input: CreatePortalInput): Promise<PortalResult>;
  listSubscriptions(input: UserBillingInput): Promise<readonly BillingSubscription[]>;
  cancelSubscription(input: SubscriptionMutationInput): Promise<void>;
  restoreSubscription(input: SubscriptionMutationInput): Promise<void>;
  getActivePlan(input: UserBillingInput): Promise<ActivePlan>;
  hasFeature(input: { readonly userId: string; readonly feature: string }): Promise<boolean>;
};
