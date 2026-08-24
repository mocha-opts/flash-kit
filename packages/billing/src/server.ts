import 'server-only';

import type { ActivePlan, BillingClient, CreditBalance, CreditTransactionView } from '#types';

/**
 * Returns the configured provider-neutral billing client.
 *
 * @throws {Error} Always in T01 because billing providers are not configured.
 */
export function getBilling(): BillingClient {
  throw new Error('T01-not-configured: billing providers are not configured.');
}

/**
 * Placeholder for the Better Auth billing plugin boundary.
 *
 * @throws {Error} Always in T01 because billing providers are not configured.
 */
export function createBetterAuthBillingPlugin(): never {
  throw new Error('T01-not-configured: billing providers are not configured.');
}

/**
 * Resolves the current user's active plan without exposing provider response types.
 *
 * @throws {Error} Always in T01 because billing providers are not configured.
 */
export async function getActivePlan(): Promise<ActivePlan> {
  throw new Error('T01-not-configured: billing providers are not configured.');
}

/**
 * Reads the current user's credit balance.
 *
 * @throws {Error} Always in T01 because billing providers are not configured.
 */
export async function getCreditBalance(): Promise<CreditBalance> {
  throw new Error('T01-not-configured: billing providers are not configured.');
}

/**
 * Lists the current user's credit history as a provider-neutral view.
 *
 * @throws {Error} Always in T01 because billing providers are not configured.
 */
export async function listCreditTransactions(): Promise<readonly CreditTransactionView[]> {
  throw new Error('T01-not-configured: billing providers are not configured.');
}

/**
 * Placeholder for an atomic credit workflow; it must not be implemented in the database package.
 *
 * @throws {Error} Always in T01 because billing providers are not configured.
 */
export async function consumeCredits(): Promise<never> {
  throw new Error('T01-not-configured: billing providers are not configured.');
}

/**
 * Placeholder for a provider-neutral feature entitlement check.
 *
 * @throws {Error} Always in T01 because billing providers are not configured.
 */
export function hasFeature(): never {
  throw new Error('T01-not-configured: billing providers are not configured.');
}
