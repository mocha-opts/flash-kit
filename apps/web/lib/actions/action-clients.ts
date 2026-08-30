import 'server-only';

import {
  type AuthSession,
  type AuthUser,
  ForbiddenError,
  getSession,
  requireAdmin,
  UnauthenticatedError,
} from '@repo/auth/server';
import { isLocale, type Locale } from '@repo/i18n/config';
import { getLocale, getTranslations } from '@repo/i18n/server';
import { createSafeActionClient, returnServerError } from 'next-safe-action';

export type ActionServerError = {
  readonly message: string;
};

export type AuthenticatedActionContext = {
  readonly locale: Locale;
  readonly session: AuthSession;
  readonly user: AuthUser;
};

type SafeErrorKind =
  | 'accountDeletionActiveSubscription'
  | 'accountDeletionSubscriptionState'
  | 'activeSubscriptionExists'
  | 'billingEmailVerificationRequired'
  | 'billingUnavailable'
  | 'lifetimePurchaseExists'
  | 'forbidden'
  | 'generic'
  | 'recentSession'
  | 'unauthenticated';

const publicClient = createSafeActionClient<'flattened', ActionServerError>({
  defaultValidationErrorsShape: 'flattened',
  handleServerError: async () => await getSafeActionError('generic'),
});

/** Base action client for server-only first-party mutations. */
export const publicAction = publicClient;

/** Authenticated actions receive the authoritative Better Auth session and user. */
export const authenticatedAction = publicAction.use(async ({ next }) => {
  const session = await getSession();

  if (!session) {
    return returnServerError(await getSafeActionError('unauthenticated'));
  }

  return await next({
    ctx: {
      locale: await getCurrentLocale(),
      session,
      user: session.user,
    },
  });
});

/** Admin actions additionally require the trusted Better Auth admin role. */
export const adminAction = authenticatedAction.use(async ({ next }) => {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return returnServerError(await getSafeActionError('unauthenticated'));
    }

    if (error instanceof ForbiddenError) {
      return returnServerError(await getSafeActionError('forbidden'));
    }

    return returnServerError(await getSafeActionError('generic'));
  }

  return await next();
});

/** Resolves an action error from localized server messages without exposing raw failures. */
export async function getSafeActionError(
  kind: SafeErrorKind,
  requestedLocale?: Locale,
): Promise<ActionServerError> {
  const locale = requestedLocale ?? (await getCurrentLocale());
  const translations = await getTranslations({ locale, namespace: 'actions' });

  // No provider, database, or Better Auth error text crosses the action boundary.
  const message = (() => {
    switch (kind) {
      case 'accountDeletionActiveSubscription':
        return translations('accountDeletionActiveSubscription');
      case 'accountDeletionSubscriptionState':
        return translations('accountDeletionSubscriptionState');
      case 'activeSubscriptionExists':
        return translations('activeSubscriptionExists');
      case 'billingEmailVerificationRequired':
        return translations('billingEmailVerificationRequired');
      case 'billingUnavailable':
        return translations('billingUnavailable');
      case 'lifetimePurchaseExists':
        return translations('lifetimePurchaseExists');
      case 'unauthenticated':
        return translations('unauthenticated');
      case 'recentSession':
        return translations('recentSession');
      case 'forbidden':
        return translations('forbidden');
      case 'generic':
        return translations('generic');
    }
  })();

  return { message };
}

async function getCurrentLocale(): Promise<Locale> {
  try {
    const locale = await getLocale();
    return isLocale(locale) ? locale : 'en';
  } catch {
    return 'en';
  }
}
