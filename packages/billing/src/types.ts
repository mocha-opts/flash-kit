export type BillingProvider = 'stripe' | 'polar';

export type BillingPlanKind = 'free' | 'subscription' | 'lifetime' | 'credit-package';

export type BillingFeature = {
  readonly id: string;
  readonly label: string;
};

export type CatalogPlan = {
  readonly id: string;
  readonly kind: BillingPlanKind;
  readonly name: string;
  readonly features: readonly BillingFeature[];
};

export type BillingCapabilities = {
  readonly checkout: boolean;
  readonly customerPortal: boolean;
  readonly cancelSubscription: boolean;
  readonly restoreSubscription: boolean;
};

export type ActivePlan = {
  readonly planId: string;
  readonly source: 'free' | 'subscription' | 'lifetime';
};

export type CreditBalance = {
  readonly userId: string;
  readonly balance: number;
};

export type CreditTransactionView = {
  readonly id: string;
  readonly amount: number;
  readonly description: string;
};

export type BillingSubscription = {
  readonly provider: BillingProvider;
  readonly status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unknown';
};

export type BillingClient = {
  readonly provider: BillingProvider;
  readonly capabilities: BillingCapabilities;
};
