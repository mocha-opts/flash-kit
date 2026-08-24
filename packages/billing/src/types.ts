/** Provider identifiers kept independent from provider SDK response types. */
export type BillingProvider = 'stripe' | 'polar';

/** Catalog plan kinds; provider-specific products do not belong in this type. */
export type BillingPlanKind = 'free' | 'subscription' | 'lifetime' | 'credit-package';

/** A stable, displayable capability exposed by a catalog plan. */
export type BillingFeature = {
  readonly id: string;
  readonly label: string;
};

/** Provider-neutral plan metadata; payment facts remain in provider integrations. */
export type CatalogPlan = {
  readonly id: string;
  readonly kind: BillingPlanKind;
  readonly name: string;
  readonly features: readonly BillingFeature[];
};

/** Operations currently available for the configured billing provider. */
export type BillingCapabilities = {
  readonly checkout: boolean;
  readonly customerPortal: boolean;
  readonly cancelSubscription: boolean;
  readonly restoreSubscription: boolean;
};

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
