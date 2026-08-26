import 'server-only';

import { getBilling, getCreditBalance, listCreditTransactions } from '@repo/billing/server';
import type {
  ActivePlan,
  BillingCapabilities,
  BillingSubscription,
  CreditBalance,
  CreditTransactionsPage,
} from '@repo/billing/types';
import { z } from 'zod';

const creditPageSchema = z.preprocess(
  firstQueryValue,
  z.coerce.number().int().min(1).max(10_000).catch(1),
);

/** URL pagination is deliberately narrow: one bounded positive page number. */
export const billingSearchParamsSchema = z
  .object({
    creditPage: creditPageSchema,
  })
  .strict();

export type BillingSearchParams = z.output<typeof billingSearchParamsSchema>;

export const CREDIT_PAGE_SIZE = 50;

function firstQueryValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

/** Parses only the billing page's supported query key and ignores unrelated route input. */
export function parseBillingSearchParams(searchParams: unknown): BillingSearchParams {
  const query =
    typeof searchParams === 'object' && searchParams !== null
      ? (searchParams as { readonly creditPage?: unknown }).creditPage
      : undefined;

  return billingSearchParamsSchema.parse({ creditPage: query });
}

export type BillingPageData = {
  readonly activePlan: ActivePlan;
  readonly capabilities: BillingCapabilities;
  readonly creditBalance: CreditBalance;
  readonly creditTransactions: CreditTransactionsPage;
  readonly subscription: BillingSubscription | null;
};

/**
 * Loads independent billing reads for the authenticated user in parallel.
 * Provider responses are already normalized by the public Billing boundary.
 */
export async function loadBillingPage(
  userId: string,
  searchParams: BillingSearchParams,
): Promise<BillingPageData> {
  const billing = getBilling();
  const [subscriptions, activePlan, creditBalance, creditTransactions] = await Promise.all([
    billing.listSubscriptions({ userId }),
    billing.getActivePlan({ userId }),
    getCreditBalance({ userId }),
    listCreditTransactions({ userId, limit: CREDIT_PAGE_SIZE, page: searchParams.creditPage }),
  ]);

  return {
    activePlan,
    capabilities: billing.capabilities,
    creditBalance,
    creditTransactions,
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
