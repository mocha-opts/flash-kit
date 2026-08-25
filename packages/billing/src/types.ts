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

/** Provider-neutral subscription status normalized for application use. */
export type BillingSubscription = {
  readonly provider: BillingProvider;
  readonly status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unknown';
};

/** Minimal server billing client boundary; provider SDK clients stay private. */
export type BillingClient = {
  readonly provider: BillingProvider;
  readonly capabilities: BillingCapabilities;
};
