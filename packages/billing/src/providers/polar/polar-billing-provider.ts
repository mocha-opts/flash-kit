import { HTTPClientError } from '@polar-sh/sdk/models/errors/httpclienterrors.js';
import { PolarError } from '@polar-sh/sdk/models/errors/polarerror.js';
import {
  type BillingUserRecord,
  getActiveLifetimePurchaseForUser,
  getBillingUser,
} from '@repo/db/queries/billing';

import { getCatalogPlan } from '#billing-config/index';
import { getBillingProviderCapabilities } from '#config/provider-capabilities';
import { getCatalogPlanIdForPolarProduct, getPolarProductId } from '#internal/catalog-pricing';
import { getBillingReturnUrl, getCheckoutSuccessUrl } from '#internal/trusted-return-urls';
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

import { createPolarClient } from './polar-client';

const checkoutPlanIds = new Set(['pro-monthly', 'pro-yearly', 'lifetime', 'credit-pack-100']);
const noRetries = { retries: { strategy: 'none' as const } };

/** Internal sentinel used only to preserve a normal Free state for new Polar customers. */
class MissingPolarCustomerError extends Error {
  override readonly name = 'MissingPolarCustomerError';
}

/** Internal error for a subscription id that is not in the user's session. */
class SubscriptionNotOwnedError extends Error {
  override readonly name = 'SubscriptionNotOwnedError';
}

/** Internal error for a user without a subscription eligible for mutation. */
class NoActiveSubscriptionError extends Error {
  override readonly name = 'NoActiveSubscriptionError';
}

/** Private Polar adapter; Polar SDK types never leave this module. */
export class PolarBillingProvider implements BillingClient {
  readonly provider = 'polar' as const;
  readonly capabilities = getBillingProviderCapabilities('polar');

  private readonly client = createPolarClient();

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

    if (plan.kind === 'subscription') {
      const subscriptions = await this.listSubscriptions({ userId: userRecord.id });

      if (subscriptions.some(isActiveOrTrialing)) {
        throw new ActiveSubscriptionExistsError();
      }
    }

    const locale = input.locale ?? 'en';
    const productId = getPolarProductId(plan.id);
    const session = await this.providerCall('checkout creation', () =>
      this.client.checkouts.create(
        {
          products: [productId],
          externalCustomerId: userRecord.id,
          customerName: userRecord.name,
          customerEmail: userRecord.email,
          locale: toPolarLocale(locale),
          successUrl: getCheckoutSuccessUrl(locale),
          returnUrl: getBillingReturnUrl(locale),
          metadata: {
            userId: userRecord.id,
            planId: plan.id,
            purchaseKind: plan.kind,
            productId,
            ...(plan.kind === 'credit-package' ? { credits: String(plan.credits) } : {}),
            ...(plan.kind === 'subscription' ? { referenceId: userRecord.id } : {}),
          },
        },
        noRetries,
      ),
    );

    if (!session.url) {
      throw new BillingUnavailableError('Polar did not return a checkout URL.');
    }

    return { url: session.url };
  }

  async createPortal(input: CreatePortalInput): Promise<PortalResult> {
    await this.getUser(input.userId);
    const session = await this.createCustomerSession(input.userId, input.locale ?? 'en');

    return { url: session.customerPortalUrl };
  }

  async listSubscriptions(input: UserBillingInput): Promise<readonly BillingSubscription[]> {
    await this.getUser(input.userId);

    try {
      const session = await this.createCustomerSessionWithMissingCustomerPolicy(
        input.userId,
        undefined,
        true,
      );

      return await this.listSubscriptionsForSession(session.token);
    } catch (error) {
      if (error instanceof MissingPolarCustomerError) {
        return [];
      }

      throw error;
    }
  }

  async cancelSubscription(input: SubscriptionMutationInput): Promise<void> {
    const owned = await this.resolveOwnedSubscription(input);

    await this.providerCall('subscription cancellation', () =>
      this.client.customerPortal.subscriptions.update(
        { customerSession: owned.sessionToken },
        {
          id: owned.subscriptionId,
          customerSubscriptionUpdate: { cancelAtPeriodEnd: true },
        },
        noRetries,
      ),
    );
  }

  async restoreSubscription(input: SubscriptionMutationInput): Promise<void> {
    const owned = await this.resolveOwnedSubscription(input);

    await this.providerCall('subscription restoration', () =>
      this.client.customerPortal.subscriptions.update(
        { customerSession: owned.sessionToken },
        {
          id: owned.subscriptionId,
          customerSubscriptionUpdate: { cancelAtPeriodEnd: false },
        },
        noRetries,
      ),
    );
  }

  async getActivePlan(input: UserBillingInput) {
    const lifetimePurchase = await getActiveLifetimePurchaseForUser(input.userId);

    if (lifetimePurchase) {
      return { planId: 'lifetime', source: 'lifetime' as const };
    }

    const subscriptions = await this.listSubscriptions(input);
    const activeSubscription = subscriptions.find(isActiveOrTrialing);

    if (!activeSubscription) {
      return { planId: 'free', source: 'free' as const };
    }

    if (activeSubscription.planId === 'unknown') {
      throw new BillingUnavailableError('Polar returned an unrecognized active plan.');
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

  private async createCustomerSession(userId: string, locale?: BillingLocale) {
    return await this.createCustomerSessionWithMissingCustomerPolicy(userId, locale, false);
  }

  private async createCustomerSessionWithMissingCustomerPolicy(
    userId: string,
    locale: BillingLocale | undefined,
    allowMissingCustomer: boolean,
  ) {
    const createSession = () =>
      this.client.customerSessions.create(
        {
          externalCustomerId: userId,
          ...(locale ? { returnUrl: getBillingReturnUrl(locale) } : {}),
        },
        noRetries,
      );

    return allowMissingCustomer
      ? await this.providerCallAllowingMissingCustomer('customer session creation', createSession)
      : await this.providerCall('customer session creation', createSession);
  }

  private async listSubscriptionsForSession(
    customerSession: string,
  ): Promise<readonly BillingSubscription[]> {
    const list = async () => {
      const pages = await this.client.customerPortal.subscriptions.list(
        { customerSession },
        { limit: 100 },
        noRetries,
      );
      const subscriptions: BillingSubscription[] = [];

      for await (const page of pages) {
        subscriptions.push(...page.result.items.map(toBillingSubscription));
      }

      return subscriptions;
    };

    return await this.providerCall('subscription lookup', list);
  }

  /** Creates a user-scoped session and verifies the target subscription before mutation. */
  private async resolveOwnedSubscription(input: SubscriptionMutationInput): Promise<{
    readonly sessionToken: string;
    readonly subscriptionId: string;
  }> {
    await this.getUser(input.userId);

    try {
      const session = await this.createCustomerSessionWithMissingCustomerPolicy(
        input.userId,
        undefined,
        true,
      );
      const subscriptions = await this.listSubscriptionsForSession(session.token);
      const subscription = input.subscriptionId
        ? subscriptions.find((candidate) => candidate.id === input.subscriptionId)
        : subscriptions.find(isActiveOrTrialing);

      if (!subscription) {
        if (input.subscriptionId) {
          throw new SubscriptionNotOwnedError(
            'The subscription does not belong to the authenticated user.',
          );
        }

        throw new NoActiveSubscriptionError('The authenticated user has no active subscription.');
      }

      return { sessionToken: session.token, subscriptionId: subscription.id };
    } catch (error) {
      if (error instanceof MissingPolarCustomerError) {
        throw new NoActiveSubscriptionError('The authenticated user has no active subscription.');
      }

      throw error;
    }
  }

  private async providerCall<T>(operation: string, action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (isPolarProviderFailure(error)) {
        throw new BillingUnavailableError(`Polar ${operation} is currently unavailable.`);
      }

      throw error;
    }
  }

  private async providerCallAllowingMissingCustomer<T>(
    operation: string,
    action: () => Promise<T>,
  ): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (isMissingPolarCustomer(error)) {
        throw new MissingPolarCustomerError();
      }

      throwProviderError(operation, error);
    }
  }
}

function getCheckoutPlan(planId: string) {
  if (!checkoutPlanIds.has(planId)) {
    throw new Error(
      'Only the Catalog subscription, lifetime, and credit pack plans support checkout.',
    );
  }

  const plan = getCatalogPlan(planId);

  if (
    plan?.kind !== 'subscription' &&
    plan?.kind !== 'lifetime' &&
    plan?.kind !== 'credit-package'
  ) {
    throw new Error(`Catalog plan "${planId}" is not a supported checkout plan.`);
  }

  return plan;
}

function isActiveOrTrialing(subscription: BillingSubscription): boolean {
  return subscription.status === 'active' || subscription.status === 'trialing';
}

function toBillingSubscription(subscription: {
  readonly id: string;
  readonly productId: string;
  readonly status: string;
  readonly recurringInterval: string;
  readonly currentPeriodStart: Date;
  readonly currentPeriodEnd: Date;
  readonly cancelAtPeriodEnd: boolean;
}): BillingSubscription {
  const interval =
    subscription.recurringInterval === 'month' || subscription.recurringInterval === 'year'
      ? subscription.recurringInterval
      : undefined;

  return {
    id: subscription.id,
    provider: 'polar',
    planId: getCatalogPlanIdForPolarProduct(subscription.productId) ?? 'unknown',
    status: toBillingStatus(
      subscription.status,
      subscription.cancelAtPeriodEnd,
      subscription.currentPeriodEnd,
    ),
    ...(interval ? { interval } : {}),
    periodStart: subscription.currentPeriodStart.toISOString(),
    periodEnd: subscription.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  };
}

function toBillingStatus(
  status: string,
  cancelAtPeriodEnd: boolean,
  currentPeriodEnd: Date,
): BillingSubscription['status'] {
  if (status === 'canceled' && cancelAtPeriodEnd && currentPeriodEnd.getTime() > Date.now()) {
    return 'active';
  }

  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    default:
      return 'unknown';
  }
}

function toPolarLocale(locale: BillingLocale): string {
  return locale === 'zh-CN' ? 'zh-CN' : 'en';
}

function isPolarProviderFailure(error: unknown): boolean {
  return error instanceof PolarError || error instanceof HTTPClientError;
}

function throwProviderError(operation: string, error: unknown): never {
  if (isPolarProviderFailure(error)) {
    throw new BillingUnavailableError(`Polar ${operation} is currently unavailable.`);
  }

  throw error;
}

function isMissingPolarCustomer(error: unknown): boolean {
  return error instanceof PolarError && error.statusCode === 404;
}
