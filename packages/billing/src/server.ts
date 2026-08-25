import 'server-only';

import { serverEnv } from '@repo/config/env/server';
import type { ActivePlan, BillingClient, CreditBalance, CreditTransactionView } from '#types';
import { getBillingProviderCapabilities } from './config/provider-capabilities';

/**
 * Returns the configured provider-neutral billing client.
 *
 * Checkout and lifecycle operations remain unavailable until their provider
 * integrations are delivered in later tickets; this boundary still exposes the
 * deployment-selected provider and its centralized capability contract.
 */
export function getBilling(): BillingClient {
  const provider = serverEnv.BILLING_PROVIDER;

  return {
    provider,
    capabilities: getBillingProviderCapabilities(provider),
  };
}

/**
 * Placeholder for the Better Auth billing plugin boundary.
 *
 * @throws {Error} Until a later ticket wires the selected provider integration.
 */
export function createBetterAuthBillingPlugin(): never {
  throw new Error('T01-not-configured: billing providers are not configured.');
}

/**
 * Resolves the current user's active plan without exposing provider response types.
 *
 * @throws {Error} Until a later ticket wires the selected provider integration.
 */
export async function getActivePlan(): Promise<ActivePlan> {
  throw new Error('T01-not-configured: billing providers are not configured.');
}

/**
 * Reads the current user's credit balance.
 *
 * @throws {Error} Until a later ticket wires the selected provider integration.
 */
export async function getCreditBalance(): Promise<CreditBalance> {
  throw new Error('T01-not-configured: billing providers are not configured.');
}

/**
 * Lists the current user's credit history as a provider-neutral view.
 *
 * @throws {Error} Until a later ticket wires the selected provider integration.
 */
export async function listCreditTransactions(): Promise<readonly CreditTransactionView[]> {
  throw new Error('T01-not-configured: billing providers are not configured.');
}

/**
 * Placeholder for an atomic credit workflow; it must not be implemented in the database package.
 *
 * @throws {Error} Until a later ticket wires the selected provider integration.
 */
export async function consumeCredits(): Promise<never> {
  throw new Error('T01-not-configured: billing providers are not configured.');
}

/**
 * Placeholder for a provider-neutral feature access check.
 *
 * @throws {Error} Until a later ticket wires the selected provider integration.
 */
export function hasFeature(): never {
  throw new Error('T01-not-configured: billing providers are not configured.');
}
