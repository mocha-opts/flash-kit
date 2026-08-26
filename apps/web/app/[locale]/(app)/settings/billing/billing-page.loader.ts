import 'server-only';

import { getBilling } from '@repo/billing/server';
import type { ActivePlan, BillingCapabilities, BillingSubscription } from '@repo/billing/types';

export type BillingPageData = {
  readonly activePlan: ActivePlan;
  readonly capabilities: BillingCapabilities;
  readonly subscription: BillingSubscription | null;
};

/**
 * Loads independent billing reads for the authenticated user in parallel.
 * Provider responses are already normalized by the public Billing boundary.
 */
export async function loadBillingPage(userId: string): Promise<BillingPageData> {
  const billing = getBilling();
  const [subscriptions, activePlan] = await Promise.all([
    billing.listSubscriptions({ userId }),
    billing.getActivePlan({ userId }),
  ]);

  return {
    activePlan,
    capabilities: billing.capabilities,
    subscription: selectCurrentSubscription(subscriptions),
  };
}

function selectCurrentSubscription(
  subscriptions: readonly BillingSubscription[],
): BillingSubscription | null {
  return (
    subscriptions.find((subscription) => subscription.status === 'active') ??
    subscriptions.find((subscription) => subscription.status === 'trialing') ??
    subscriptions.find((subscription) => subscription.status === 'past_due') ??
    subscriptions.find((subscription) => subscription.status === 'canceled') ??
    subscriptions.find((subscription) => subscription.status === 'unknown') ??
    null
  );
}
