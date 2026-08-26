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
export type CreditTransactionView = {
  readonly id: string;
  readonly amount: number;
  readonly description: string;
};

/** Query shape for the stable, user-scoped credit read boundary. */
export type CreditTransactionsInput = UserBillingInput & {
  readonly page?: number;
  readonly limit?: number;
};

/** Input shape reserved for the later atomic credit-consumption workflow. */
export type ConsumeCreditsInput = UserBillingInput & {
  readonly amount: number;
  readonly description: string;
  readonly referenceType: string;
  readonly referenceId: string;
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
