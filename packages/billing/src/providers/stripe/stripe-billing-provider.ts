import {
  type BillingUserRecord,
  getActiveLifetimePurchaseForUser,
  getBillingUser,
  setStripeCustomerIdIfMissing,
} from '@repo/db/queries/billing';
import type Stripe from 'stripe';

import { getCatalogPlan } from '#billing-config/index';
import { getBillingProviderCapabilities } from '#config/provider-capabilities';
import { getStripePriceId, getStripeProductId } from '#internal/catalog-pricing';
import {
  getBillingReturnUrl,
  getCheckoutCancelUrl,
  getCheckoutSuccessUrl,
} from '#internal/trusted-return-urls';
import type {
  BillingClient,
  BillingLocale,
  BillingSubscription,
  CheckoutResult,
  CreateCheckoutInput,
  CreatePortalInput,
  PortalResult,
  SubscriptionMutationInput,
  UserBillingInput,
} from '#types';
import {
  ActiveSubscriptionExistsError,
  BillingEmailVerificationRequiredError,
  BillingUnavailableError,
  LifetimePurchaseExistsError,
} from '#types';
import { createStripeClient, isStripeProviderFailure } from './stripe-client';

/** Private Stripe adapter; no Stripe types or raw responses leave this module. */
export class StripeBillingProvider implements BillingClient {
  readonly provider = 'stripe' as const;
  readonly capabilities = getBillingProviderCapabilities('stripe');

  private readonly client = createStripeClient();

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult> {
    const plan = getCheckoutPlan(input.planId);
    const userRecord = await this.getUser(input.userId);

    if (!userRecord.emailVerified) {
      throw new BillingEmailVerificationRequiredError();
    }

    if (plan.kind === 'lifetime') {
      const lifetimePurchase = await getActiveLifetimePurchaseForUser(userRecord.id);

      if (lifetimePurchase) {
        throw new LifetimePurchaseExistsError();
      }
    }

    const customerId = await this.ensureCustomer(userRecord);

    if (plan.kind === 'subscription') {
      const subscriptions = await this.listSubscriptionsForCustomer(customerId);

      if (subscriptions.some(isActiveOrTrialing)) {
        throw new ActiveSubscriptionExistsError();
      }
    }

    const locale = input.locale ?? 'en';
    const productId = getStripeProductId(plan.id);
    const priceId = getStripePriceId(plan.id);

    const metadata = {
      userId: userRecord.id,
      planId: plan.id,
      purchaseKind: plan.kind,
      productId,
      priceId,
      ...(plan.kind === 'credit-package' ? { credits: String(plan.credits) } : {}),
      ...(plan.kind === 'subscription' ? { referenceId: userRecord.id } : {}),
    };
    const session = await this.providerCall('checkout', () =>
      this.client.checkout.sessions.create(
        plan.kind === 'subscription'
          ? {
              mode: 'subscription',
              customer: customerId,
              line_items: [{ price: priceId, quantity: 1 }],
              client_reference_id: userRecord.id,
              locale: toStripeLocale(locale),
              success_url: getCheckoutSuccessUrl(locale),
              cancel_url: getCheckoutCancelUrl(locale),
              subscription_data: { metadata },
            }
          : {
              mode: 'payment',
              customer: customerId,
              line_items: [{ price: priceId, quantity: 1 }],
              client_reference_id: userRecord.id,
              locale: toStripeLocale(locale),
              success_url: getCheckoutSuccessUrl(locale),
              cancel_url: getCheckoutCancelUrl(locale),
              metadata,
              payment_intent_data: { metadata },
            },
      ),
    );

    if (!session.url) {
      throw new BillingUnavailableError('Stripe did not return a checkout URL.');
    }

    return { url: session.url };
  }

  async createPortal(input: CreatePortalInput): Promise<PortalResult> {
    const userRecord = await this.getUser(input.userId);
    const customerId = requireCustomerId(userRecord);
    const session = await this.providerCall('customer portal', () =>
      this.client.billingPortal.sessions.create({
        customer: customerId,
        return_url: getBillingReturnUrl(input.locale ?? 'en'),
      }),
    );

    return { url: session.url };
  }

  async listSubscriptions(input: UserBillingInput): Promise<readonly BillingSubscription[]> {
    const userRecord = await this.getUser(input.userId);
    const customerId = userRecord.stripeCustomerId;

    if (!customerId) {
      return [];
    }

    return await this.listSubscriptionsForCustomer(customerId);
  }

  async cancelSubscription(input: SubscriptionMutationInput): Promise<void> {
    const subscriptionId = await this.resolveOwnedSubscription(input);

    await this.providerCall('subscription cancellation', () =>
      this.client.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      }),
    );
  }

  async restoreSubscription(input: SubscriptionMutationInput): Promise<void> {
    const subscriptionId = await this.resolveOwnedSubscription(input);

    await this.providerCall('subscription restoration', () =>
      this.client.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      }),
    );
  }

  async getActivePlan(input: UserBillingInput) {
    const lifetimePurchase = await getActiveLifetimePurchaseForUser(input.userId);

    if (lifetimePurchase) {
      return { planId: 'lifetime', source: 'lifetime' as const };
    }

    const subscriptions = await this.listSubscriptions(input);
    const activeSubscription = subscriptions.find(
      (candidate) => candidate.status === 'active' || candidate.status === 'trialing',
    );

    if (!activeSubscription) {
      return { planId: 'free', source: 'free' as const };
    }

    if (activeSubscription.planId === 'unknown') {
      throw new BillingUnavailableError('Stripe returned an unrecognized active plan.');
    }

    return { planId: activeSubscription.planId, source: 'subscription' as const };
  }

  async hasFeature(input: { readonly userId: string; readonly feature: string }): Promise<boolean> {
    const activePlan = await this.getActivePlan(input);
    const plan = getCatalogPlan(activePlan.planId);

    if (!plan) {
      return false;
    }

    return plan.features.some((feature) =>
      typeof feature === 'string' ? feature === input.feature : feature.id === input.feature,
    );
  }

  private async getUser(userId: string): Promise<BillingUserRecord> {
    const userRecord = await getBillingUser(userId);
    if (!userRecord) {
      throw new Error('Billing user was not found for the authenticated user id.');
    }

    return userRecord;
  }

  private async ensureCustomer(userRecord: BillingUserRecord): Promise<string> {
    if (userRecord.stripeCustomerId) {
      return userRecord.stripeCustomerId;
    }

    const customer = await this.providerCall('customer creation', () =>
      this.client.customers.create({
        name: userRecord.name,
        email: userRecord.email,
        metadata: { userId: userRecord.id, customerType: 'user' },
      }),
    );

    return await setStripeCustomerIdIfMissing(userRecord.id, customer.id);
  }

  private async resolveOwnedSubscription(input: SubscriptionMutationInput): Promise<string> {
    if (input.subscriptionId) {
      const subscriptions = await this.listSubscriptions(input);
      const owned = subscriptions.find((candidate) => candidate.id === input.subscriptionId);

      if (!owned) {
        throw new Error('The subscription does not belong to the authenticated user.');
      }

      return owned.id;
    }

    const subscriptions = await this.listSubscriptions(input);
    const active = subscriptions.find(
      (candidate) => candidate.status === 'active' || candidate.status === 'trialing',
    );

    if (!active) {
      throw new Error('The authenticated user has no active subscription.');
    }

    return active.id;
  }

  private async providerCall<T>(operation: string, action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (isStripeProviderFailure(error)) {
        throw new BillingUnavailableError(`Stripe ${operation} is currently unavailable.`);
      }

      throw error;
    }
  }

  private async listSubscriptionsForCustomer(
    customerId: string,
  ): Promise<readonly BillingSubscription[]> {
    const response = await this.providerCall('subscription lookup', () =>
      this.client.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 100,
      }),
    );

    return response.data.map(toBillingSubscription);
  }
}

function getCheckoutPlan(planId: string) {
  const plan = getCatalogPlan(planId);

  if (
    plan?.kind !== 'subscription' &&
    plan?.kind !== 'lifetime' &&
    plan?.kind !== 'credit-package'
  ) {
    throw new Error(
      'Only the Catalog subscription, lifetime, and credit pack plans support checkout.',
    );
  }

  return plan;
}

function requireCustomerId(userRecord: BillingUserRecord): string {
  if (!userRecord.stripeCustomerId) {
    throw new BillingUnavailableError('Billing customer setup is not available yet.');
  }

  return userRecord.stripeCustomerId;
}

function toStripeLocale(locale: BillingLocale): 'en' | 'zh' {
  return locale === 'zh-CN' ? 'zh' : 'en';
}

function toBillingSubscription(value: Stripe.Subscription): BillingSubscription {
  const item = value.items.data[0];
  const planId = resolvePlanId(item?.price.id);
  const normalizedInterval = toBillingInterval(item?.price.recurring?.interval);

  return {
    id: value.id,
    provider: 'stripe',
    planId,
    status: normalizeStatus(value.status),
    ...(normalizedInterval ? { interval: normalizedInterval } : {}),
    ...(item?.current_period_start
      ? { periodStart: new Date(item.current_period_start * 1000).toISOString() }
      : {}),
    ...(item?.current_period_end
      ? { periodEnd: new Date(item.current_period_end * 1000).toISOString() }
      : {}),
    cancelAtPeriodEnd: value.cancel_at_period_end,
  };
}

function resolvePlanId(priceId: string | undefined): string {
  if (!priceId) {
    return 'unknown';
  }

  for (const plan of ['pro-monthly', 'pro-yearly'] as const) {
    const candidate = getCatalogPlan(plan);

    if (candidate?.kind === 'subscription' && candidate.providers.stripe?.priceId === priceId) {
      return candidate.id;
    }
  }

  return 'unknown';
}

function toBillingInterval(interval: string | undefined): BillingSubscription['interval'] {
  return interval === 'month' || interval === 'year' ? interval : undefined;
}

function normalizeStatus(status: string): BillingSubscription['status'] {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'canceled':
    case 'past_due':
      return status;
    default:
      return 'unknown';
  }
}

function isActiveOrTrialing(subscription: BillingSubscription): boolean {
  return subscription.status === 'active' || subscription.status === 'trialing';
}
