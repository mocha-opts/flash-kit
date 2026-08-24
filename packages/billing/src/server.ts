import 'server-only';

import type { ActivePlan, BillingClient, CreditBalance, CreditTransactionView } from '#types';

export function getBilling(): BillingClient {
  throw new Error('Billing providers are implemented after the T01 boundary scaffold.');
}

export function createBetterAuthBillingPlugin(): never {
  throw new Error('Billing provider plugins are implemented after the T01 boundary scaffold.');
}

export async function getActivePlan(): Promise<ActivePlan> {
  throw new Error('Active plan resolution is implemented after the T01 boundary scaffold.');
}

export async function getCreditBalance(): Promise<CreditBalance> {
  throw new Error('Credit balance queries are implemented after the T01 boundary scaffold.');
}

export async function listCreditTransactions(): Promise<readonly CreditTransactionView[]> {
  throw new Error('Credit history queries are implemented after the T01 boundary scaffold.');
}

export async function consumeCredits(): Promise<never> {
  throw new Error('Credit workflows are implemented after the T01 boundary scaffold.');
}

export function hasFeature(): never {
  throw new Error('Feature checks are implemented after the T01 boundary scaffold.');
}
