'use server';

import {
  deleteCurrentUserAccount,
  getSafeCallbackPath,
  requestEmailChange,
  revokeCurrentOtherSessions,
  revokeCurrentSession,
} from '@repo/auth/server';
import { assertAccountDeletionAllowed } from '@repo/billing/server';
import {
  AccountDeletionActiveSubscriptionError,
  AccountDeletionSubscriptionStateError,
  BillingUnavailableError,
} from '@repo/billing/types';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { returnServerError } from 'next-safe-action';

import { authenticatedAction, getSafeActionError } from '@/lib/actions/action-clients';

import {
  accountDeletionSchema,
  emailChangeSchema,
  revokeOtherSessionsSchema,
  revokeSessionSchema,
} from '../_schemas/security.schema';

/** Deletes only after an explicit confirmation, Provider preflight, and fresh-session recheck. */
export const deleteAccountAction = authenticatedAction
  .inputSchema(accountDeletionSchema)
  .action(async ({ ctx }) => {
    try {
      await assertAccountDeletionAllowed({ userId: ctx.user.id });
    } catch (error) {
      if (error instanceof AccountDeletionActiveSubscriptionError) {
        return returnServerError(await getSafeActionError('accountDeletionActiveSubscription'));
      }

      if (error instanceof AccountDeletionSubscriptionStateError) {
        return returnServerError(await getSafeActionError('accountDeletionSubscriptionState'));
      }

      if (error instanceof BillingUnavailableError) {
        return returnServerError(await getSafeActionError('billingUnavailable'));
      }

      throw error;
    }

    try {
      await deleteCurrentUserAccount(ctx.user.id);
    } catch (error) {
      if (isSessionNotFreshError(error)) {
        return returnServerError(await getSafeActionError('recentSession'));
      }

      throw error;
    }

    return { deleted: true };
  });

/** Revokes one owned session; revoking the current session redirects to sign-in. */
export const revokeSessionAction = authenticatedAction
  .inputSchema(revokeSessionSchema)
  .action(async ({ ctx, parsedInput }) => {
    const securityPath = getLocalizedPathname({
      locale: ctx.locale,
      pathname: '/settings/security',
    });
    let result: Awaited<ReturnType<typeof revokeCurrentSession>>;

    try {
      result = await revokeCurrentSession(parsedInput.sessionId);
      revalidatePath(securityPath);
    } catch {
      return returnServerError(await getSafeActionError('generic'));
    }

    if (result.currentSessionRevoked) {
      redirect(getLocalizedPathname({ locale: ctx.locale, pathname: '/auth/sign-in' }));
    }

    return { revoked: result.revoked };
  });

/** Revokes every other owned session without accepting a user id or token from the client. */
export const revokeOtherSessionsAction = authenticatedAction
  .inputSchema(revokeOtherSessionsSchema)
  .action(async ({ ctx }) => {
    try {
      const result = await revokeCurrentOtherSessions();
      revalidatePath(getLocalizedPathname({ locale: ctx.locale, pathname: '/settings/security' }));
      return { revokedCount: result.revokedCount };
    } catch {
      return returnServerError(await getSafeActionError('generic'));
    }
  });

/** Requests a localized, recent-session-protected email change through the auth package boundary. */
export const requestEmailChangeAction = authenticatedAction
  .inputSchema(emailChangeSchema)
  .action(async ({ ctx, parsedInput }) => {
    const fallbackPath = getLocalizedPathname({
      locale: ctx.locale,
      pathname: '/settings/security',
    });
    const callbackPath = getSafeCallbackPath(parsedInput.callbackPath, fallbackPath);

    try {
      await requestEmailChange({
        callbackURL: callbackPath,
        locale: ctx.locale,
        newEmail: parsedInput.newEmail,
      });
    } catch (error) {
      return returnServerError(
        await getSafeActionError(isSessionNotFreshError(error) ? 'recentSession' : 'generic'),
      );
    }

    return { requested: true };
  });

function isSessionNotFreshError(error: unknown): boolean {
  if (!isErrorShape(error)) {
    return false;
  }

  if (error.code === 'SESSION_NOT_FRESH') {
    return true;
  }

  return isErrorShape(error.body) && error.body.code === 'SESSION_NOT_FRESH';
}

function isErrorShape(value: unknown): value is {
  readonly body?: unknown;
  readonly code?: unknown;
} {
  return typeof value === 'object' && value !== null;
}
