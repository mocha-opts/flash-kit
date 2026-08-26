'use server';

import { getBilling } from '@repo/billing/server';
import {
  ActiveSubscriptionExistsError,
  BillingEmailVerificationRequiredError,
  BillingUnavailableError,
  LifetimePurchaseExistsError,
} from '@repo/billing/types';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { returnServerError } from 'next-safe-action';

import { authenticatedAction, getSafeActionError } from '@/lib/actions/action-clients';

import {
  checkoutSchema,
  portalSchema,
  subscriptionMutationSchema,
} from '../_schemas/billing.schema';

/** Starts a supported catalog checkout with the authenticated user context. */
export const createCheckoutAction = authenticatedAction
  .inputSchema(checkoutSchema)
  .action(async ({ ctx, parsedInput }) => {
    let result: { readonly url: string };

    try {
      result = await getBilling().createCheckout({
        locale: ctx.locale,
        planId: parsedInput.planId,
        userId: ctx.user.id,
      });
    } catch (error) {
      const safeError = await getBillingActionError(error, ctx.locale);

      if (safeError) {
        return safeError;
      }

      throw error;
    }

    redirect(result.url);
  });

/** Opens the trusted provider portal URL; callers cannot supply a URL or user id. */
export const createPortalAction = authenticatedAction
  .inputSchema(portalSchema)
  .action(async ({ ctx }) => {
    let result: { readonly url: string };

    try {
      result = await getBilling().createPortal({
        locale: ctx.locale,
        userId: ctx.user.id,
      });
    } catch (error) {
      const safeError = await getBillingActionError(error, ctx.locale);

      if (safeError) {
        return safeError;
      }

      throw error;
    }

    redirect(result.url);
  });

/** Cancels an owned subscription at the end of its current billing period. */
export const cancelSubscriptionAction = authenticatedAction
  .inputSchema(subscriptionMutationSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      await getBilling().cancelSubscription({
        subscriptionId: parsedInput.subscriptionId,
        userId: ctx.user.id,
      });
    } catch (error) {
      const safeError = await getBillingActionError(error, ctx.locale);

      if (safeError) {
        return safeError;
      }

      throw error;
    }

    revalidateBillingPath(ctx.locale);
    return { updated: true };
  });

/** Restores an owned subscription that was scheduled to cancel. */
export const restoreSubscriptionAction = authenticatedAction
  .inputSchema(subscriptionMutationSchema)
  .action(async ({ ctx, parsedInput }) => {
    try {
      await getBilling().restoreSubscription({
        subscriptionId: parsedInput.subscriptionId,
        userId: ctx.user.id,
      });
    } catch (error) {
      const safeError = await getBillingActionError(error, ctx.locale);

      if (safeError) {
        return safeError;
      }

      throw error;
    }

    revalidateBillingPath(ctx.locale);
    return { updated: true };
  });

function revalidateBillingPath(locale: Parameters<typeof getLocalizedPathname>[0]['locale']): void {
  revalidatePath(getLocalizedPathname({ locale, pathname: '/settings/billing' }));
}

type BillingActionErrorKind =
  | 'activeSubscriptionExists'
  | 'billingEmailVerificationRequired'
  | 'lifetimePurchaseExists'
  | 'billingUnavailable';

async function getBillingActionError(
  error: unknown,
  locale: Parameters<typeof getLocalizedPathname>[0]['locale'],
) {
  const kind = getBillingActionErrorKind(error);

  return kind ? returnServerError(await getSafeActionError(kind, locale)) : null;
}

function getBillingActionErrorKind(error: unknown): BillingActionErrorKind | null {
  if (error instanceof ActiveSubscriptionExistsError) {
    return 'activeSubscriptionExists';
  }

  if (error instanceof BillingEmailVerificationRequiredError) {
    return 'billingEmailVerificationRequired';
  }

  if (error instanceof LifetimePurchaseExistsError) {
    return 'lifetimePurchaseExists';
  }

  if (error instanceof BillingUnavailableError) {
    return 'billingUnavailable';
  }

  return null;
}
