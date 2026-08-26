'use client';

import type { BillingCapabilities, BillingSubscription } from '@repo/billing/types';
import { useRouter } from '@repo/i18n/navigation';
import { buttonVariants } from '@repo/ui/button';
import { useState } from 'react';

import {
  cancelSubscriptionAction,
  createCheckoutAction,
  createPortalAction,
  restoreSubscriptionAction,
} from '../_actions/billing.actions';

type BillingCapability = keyof BillingCapabilities;
type PendingAction = BillingCapability | null;
type Feedback = { readonly kind: 'error' | 'success'; readonly message: string } | null;
type BillingActionResult =
  | Awaited<ReturnType<typeof cancelSubscriptionAction>>
  | Awaited<ReturnType<typeof createCheckoutAction>>
  | Awaited<ReturnType<typeof createPortalAction>>
  | Awaited<ReturnType<typeof restoreSubscriptionAction>>;

export type BillingActionsLabels = {
  readonly actionFailed: string;
  readonly cancel: string;
  readonly cancelPending: string;
  readonly checkoutDescription: string;
  readonly checkoutLifetime: string;
  readonly checkoutLifetimePending: string;
  readonly checkoutMonthly: string;
  readonly checkoutMonthlyPending: string;
  readonly checkoutTitle: string;
  readonly checkoutYearly: string;
  readonly checkoutYearlyPending: string;
  readonly lifetimeDescription: string;
  readonly lifetimeTitle: string;
  readonly manageDescription: string;
  readonly manageTitle: string;
  readonly portal: string;
  readonly portalPending: string;
  readonly restore: string;
  readonly restorePending: string;
  readonly updated: string;
};

type BillingActionsProps = {
  readonly capabilities: BillingCapabilities;
  readonly labels: BillingActionsLabels;
  readonly lifetimeActive: boolean;
  readonly subscriptionId: BillingSubscription['id'] | null;
  readonly subscriptionStatus: BillingSubscription['status'] | null;
  readonly cancelAtPeriodEnd: boolean;
};

/** Client-only billing controls; provider responses and subscription caches stay server-side. */
export function BillingActions({
  capabilities,
  cancelAtPeriodEnd,
  lifetimeActive,
  labels,
  subscriptionId,
  subscriptionStatus,
}: BillingActionsProps) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const hasActiveSubscription =
    subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const showSubscriptionCheckout =
    capabilities.checkout && !lifetimeActive && !hasActiveSubscription;
  const showLifetimeCheckout = capabilities.lifetimeCheckout && !lifetimeActive;
  const showPortal = capabilities.customerPortal && subscriptionId !== null;
  const showCancel =
    capabilities.cancelSubscription &&
    subscriptionId !== null &&
    hasActiveSubscription &&
    !cancelAtPeriodEnd;
  const showRestore =
    capabilities.restoreSubscription && subscriptionId !== null && cancelAtPeriodEnd;
  const hasActions =
    showSubscriptionCheckout || showLifetimeCheckout || showPortal || showCancel || showRestore;

  if (!hasActions) {
    return null;
  }

  const runAction = async (
    action: PendingAction,
    request: () => Promise<BillingActionResult>,
    success?: boolean,
  ) => {
    if (pendingAction !== null || action === null) {
      return;
    }

    setPendingAction(action);
    setFeedback(null);

    try {
      const result = await request();

      if (result.serverError?.message) {
        setFeedback({ kind: 'error', message: result.serverError.message });
        return;
      }

      if (result.validationErrors) {
        setFeedback({ kind: 'error', message: labels.actionFailed });
        return;
      }

      if (success) {
        setFeedback({ kind: 'success', message: labels.updated });
        router.refresh();
      }
    } catch {
      setFeedback({ kind: 'error', message: labels.actionFailed });
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <section
      aria-labelledby="billing-actions-title"
      className="mt-12 border-y border-border py-8 sm:mt-16 sm:py-10"
    >
      <div className="max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]" id="billing-actions-title">
          {labels.manageTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{labels.manageDescription}</p>
      </div>

      {showSubscriptionCheckout ? (
        <div className="mt-8 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {labels.checkoutTitle}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{labels.checkoutDescription}</p>
          </div>
          <div className="flex min-w-0 flex-wrap gap-3 sm:justify-end sm:self-end">
            <button
              aria-label={
                pendingAction === 'checkout'
                  ? labels.checkoutMonthlyPending
                  : labels.checkoutMonthly
              }
              className={buttonVariants({ size: 'sm' })}
              disabled={pendingAction !== null}
              onClick={() =>
                void runAction('checkout', () => createCheckoutAction({ planId: 'pro-monthly' }))
              }
              type="button"
            >
              {pendingAction === 'checkout'
                ? labels.checkoutMonthlyPending
                : labels.checkoutMonthly}
            </button>
            <button
              aria-label={
                pendingAction === 'checkout' ? labels.checkoutYearlyPending : labels.checkoutYearly
              }
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
              disabled={pendingAction !== null}
              onClick={() =>
                void runAction('checkout', () => createCheckoutAction({ planId: 'pro-yearly' }))
              }
              type="button"
            >
              {pendingAction === 'checkout' ? labels.checkoutYearlyPending : labels.checkoutYearly}
            </button>
          </div>
        </div>
      ) : null}

      {showLifetimeCheckout ? (
        <div className="mt-8 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {labels.lifetimeTitle}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{labels.lifetimeDescription}</p>
          </div>
          <div className="flex min-w-0 flex-wrap gap-3 sm:justify-end sm:self-end">
            <button
              aria-label={
                pendingAction === 'checkout'
                  ? labels.checkoutLifetimePending
                  : labels.checkoutLifetime
              }
              className={buttonVariants({ size: 'sm' })}
              disabled={pendingAction !== null}
              onClick={() =>
                void runAction('checkout', () => createCheckoutAction({ planId: 'lifetime' }))
              }
              type="button"
            >
              {pendingAction === 'checkout'
                ? labels.checkoutLifetimePending
                : labels.checkoutLifetime}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex min-w-0 flex-wrap gap-3 border-t border-border pt-6">
        {showPortal ? (
          <button
            aria-label={pendingAction === 'customerPortal' ? labels.portalPending : labels.portal}
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            disabled={pendingAction !== null}
            onClick={() => void runAction('customerPortal', () => createPortalAction({}))}
            type="button"
          >
            {pendingAction === 'customerPortal' ? labels.portalPending : labels.portal}
          </button>
        ) : null}
        {showCancel ? (
          <button
            className={buttonVariants({ variant: 'destructive', size: 'sm' })}
            disabled={pendingAction !== null}
            onClick={() =>
              void runAction(
                'cancelSubscription',
                () => cancelSubscriptionAction({ subscriptionId: subscriptionId ?? '' }),
                true,
              )
            }
            type="button"
          >
            {pendingAction === 'cancelSubscription' ? labels.cancelPending : labels.cancel}
          </button>
        ) : null}
        {showRestore ? (
          <button
            className={buttonVariants({ size: 'sm' })}
            disabled={pendingAction !== null}
            onClick={() =>
              void runAction(
                'restoreSubscription',
                () => restoreSubscriptionAction({ subscriptionId: subscriptionId ?? '' }),
                true,
              )
            }
            type="button"
          >
            {pendingAction === 'restoreSubscription' ? labels.restorePending : labels.restore}
          </button>
        ) : null}
      </div>

      {feedback ? (
        <p
          aria-live={feedback.kind === 'error' ? 'assertive' : 'polite'}
          className={`mt-5 text-sm ${feedback.kind === 'error' ? 'text-destructive' : 'text-primary'}`}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
