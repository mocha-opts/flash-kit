import 'server-only';

import type { BetterAuthPlugin } from '@better-auth/core';
import { getCurrentAdapter, runWithTransaction } from '@better-auth/core/context';
import { sendEmailChangeNotice, sendEmailChangeVerificationEmail } from '@repo/email/server';
import {
  APIError,
  createAuthEndpoint,
  freshSessionMiddleware,
  getAuthoritativeSessionFromCtx,
  originCheck,
} from 'better-auth/api';
import { generateRandomString } from 'better-auth/crypto';
import { z } from 'zod';

import { authConfig } from '#config/auth-config';
import { resolveAuthEmailLocale } from '#internal/magic-link-context';
import { getSafeCallbackPath } from '#internal/safe-callback-path';

const emailChangeRequestBody = z.object({
  newEmail: z.email().transform((email) => email.trim().toLowerCase()),
  callbackURL: z.string().optional(),
  locale: z.enum(['en', 'zh-CN']).optional(),
});

const emailChangeVerificationQuery = z.object({
  token: z.string().min(1),
  callbackURL: z.string().optional(),
});

const emailChangeValue = z.object({
  userId: z.string().min(1),
  oldEmail: z.email(),
  newEmail: z.email(),
  initiatedSessionId: z.string().min(1),
});

const EMAIL_CHANGE_ERROR_CODE = 'EMAIL_CHANGE_FAILED';
const EMAIL_CHANGE_ERROR_MESSAGE = 'The email change could not be completed.';

type EmailChangeValue = z.infer<typeof emailChangeValue>;
type EmailChangeVerificationFailureCode =
  | 'invalid-email-change-payload'
  | 'invalid-email-change-verification'
  | 'email-change-session-mismatch'
  | 'email-change-source-mismatch'
  | 'email-change-source-updated'
  | 'email-change-target-taken';

/** Expected verification refusals are safe to turn into the generic callback result. */
class EmailChangeVerificationFailure extends Error {
  readonly code: EmailChangeVerificationFailureCode;

  constructor(code: EmailChangeVerificationFailureCode) {
    super('Email change verification was rejected.');
    this.name = 'EmailChangeVerificationFailure';
    this.code = code;
  }
}

/**
 * The email-change request sends both messages before persisting the hashed
 * verification record. External email delivery cannot be rolled back, so a
 * delivery failure deliberately leaves no live credential or account/session
 * state; if the final database insert fails, the emailed link is invalid because
 * no verification record exists.
 */
const requestEmailChange = createAuthEndpoint(
  '/email-change/request',
  {
    method: 'POST',
    body: emailChangeRequestBody,
    use: [freshSessionMiddleware],
    metadata: { noStore: true },
  },
  async (ctx) => {
    const session = ctx.context.session;
    const requestedEmail = ctx.body.newEmail;
    const currentEmail = session.user.email;
    const normalizedCurrentEmail = currentEmail.trim().toLowerCase();
    const callbackURL = getSafeCallbackPath(ctx.body.callbackURL, '/settings/security');
    const locale =
      ctx.body.locale ??
      resolveAuthEmailLocale(new URL(callbackURL, ctx.context.baseURL).toString(), ctx.request);

    if (requestedEmail === normalizedCurrentEmail) {
      throw APIError.from('BAD_REQUEST', {
        code: EMAIL_CHANGE_ERROR_CODE,
        message: EMAIL_CHANGE_ERROR_MESSAGE,
      });
    }

    const existingUser = await ctx.context.internalAdapter.findUserByEmail(requestedEmail);
    if (existingUser) {
      throw APIError.from('BAD_REQUEST', {
        code: EMAIL_CHANGE_ERROR_CODE,
        message: EMAIL_CHANGE_ERROR_MESSAGE,
      });
    }

    const token = generateRandomString(64);
    const expiresAt = new Date(Date.now() + authConfig.emailChangeExpiresInSeconds * 1000);
    const value: EmailChangeValue = {
      userId: session.user.id,
      oldEmail: currentEmail,
      newEmail: requestedEmail,
      initiatedSessionId: session.session.id,
    };

    try {
      const verificationURL = createVerificationURL(ctx.context.baseURL, token, callbackURL);
      await Promise.all([
        sendEmailChangeVerificationEmail({
          email: requestedEmail,
          url: verificationURL,
          expiresInMinutes: Math.ceil(authConfig.emailChangeExpiresInSeconds / 60),
          locale,
        }),
        sendEmailChangeNotice({
          email: currentEmail,
          newEmail: requestedEmail,
          locale,
        }),
      ]);
    } catch {
      ctx.context.logger.error('Email change delivery failed.');
      throw APIError.from('INTERNAL_SERVER_ERROR', {
        code: EMAIL_CHANGE_ERROR_CODE,
        message: EMAIL_CHANGE_ERROR_MESSAGE,
      });
    }

    try {
      await ctx.context.internalAdapter.createVerificationValue({
        identifier: token,
        value: JSON.stringify(value),
        expiresAt,
      });
    } catch {
      ctx.context.logger.error('Email change verification setup failed.');
      throw APIError.from('INTERNAL_SERVER_ERROR', {
        code: EMAIL_CHANGE_ERROR_CODE,
        message: EMAIL_CHANGE_ERROR_MESSAGE,
      });
    }

    return ctx.json({ status: true });
  },
);

/**
 * Completion is deliberately a custom Better Auth endpoint rather than the
 * built-in change-email hook. Verification consumption, email update, and
 * session revocation execute inside one Better Auth adapter transaction.
 */
const verifyEmailChange = createAuthEndpoint(
  '/email-change/verify',
  {
    method: 'GET',
    query: emailChangeVerificationQuery,
    use: [originCheck((ctx) => ctx.query.callbackURL)],
    metadata: { noStore: true },
  },
  async (ctx) => {
    const callbackURL = getSafeCallbackPath(ctx.query.callbackURL, '/settings/security');
    const currentSession = await getAuthoritativeSessionFromCtx(ctx);

    try {
      await runWithTransaction(ctx.context.adapter, async () => {
        const verification = await ctx.context.internalAdapter.consumeVerificationValue(
          ctx.query.token,
        );
        if (!verification) {
          throw new EmailChangeVerificationFailure('invalid-email-change-verification');
        }

        let rawValue: unknown;
        try {
          rawValue = JSON.parse(verification.value);
        } catch {
          throw new EmailChangeVerificationFailure('invalid-email-change-payload');
        }

        const parsedValue = emailChangeValue.safeParse(rawValue);
        if (!parsedValue.success) {
          throw new EmailChangeVerificationFailure('invalid-email-change-payload');
        }

        const value = parsedValue.data;
        if (currentSession && currentSession.user.id !== value.userId) {
          throw new EmailChangeVerificationFailure('email-change-session-mismatch');
        }

        const user = await ctx.context.internalAdapter.findUserById(value.userId);
        if (!user || user.email !== value.oldEmail) {
          throw new EmailChangeVerificationFailure('email-change-source-mismatch');
        }

        const existingUser = await ctx.context.internalAdapter.findUserByEmail(value.newEmail);
        if (existingUser && existingUser.user.id !== value.userId) {
          throw new EmailChangeVerificationFailure('email-change-target-taken');
        }

        const transactionAdapter = await getCurrentAdapter(ctx.context.adapter);
        const updatedUser = await transactionAdapter.update<{ id: string }>({
          model: 'user',
          where: [
            { field: 'id', value: value.userId },
            { field: 'email', value: value.oldEmail },
          ],
          update: {
            email: value.newEmail,
            emailVerified: true,
            updatedAt: new Date(),
          },
        });
        if (!updatedUser) {
          throw new EmailChangeVerificationFailure('email-change-source-updated');
        }

        const sessions = await ctx.context.internalAdapter.listSessions(value.userId);
        const otherSessionTokens = sessions
          .filter((candidate) => candidate.id !== value.initiatedSessionId)
          .map((candidate) => candidate.token);

        if (otherSessionTokens.length > 0) {
          await ctx.context.internalAdapter.deleteSessions(otherSessionTokens);
        }
      });
    } catch (error) {
      if (!isEmailChangeVerificationFailure(error)) {
        throw error;
      }

      return redirectWithResult(ctx, callbackURL, 'error');
    }

    return redirectWithResult(ctx, callbackURL, 'success');
  },
);

function createVerificationURL(baseURL: string, token: string, callbackURL: string): string {
  const realBaseURL = new URL(baseURL);
  const pathname = realBaseURL.pathname === '/' ? '' : realBaseURL.pathname;
  const basePath = pathname ? '' : authConfig.basePath;
  const verificationURL = new URL(`${pathname}${basePath}/email-change/verify`, realBaseURL.origin);

  verificationURL.searchParams.set('token', token);
  verificationURL.searchParams.set('callbackURL', callbackURL);
  return verificationURL.toString();
}

function isEmailChangeVerificationFailure(error: unknown): error is EmailChangeVerificationFailure {
  return error instanceof EmailChangeVerificationFailure;
}

function redirectWithResult(
  ctx: RedirectContext,
  callbackURL: string,
  result: 'success' | 'error',
): never {
  const redirectURL = new URL(callbackURL, ctx.context.baseURL);
  redirectURL.searchParams.set(result === 'success' ? 'emailChange' : 'emailChangeError', '1');
  throw ctx.redirect(redirectURL.toString());
}

type RedirectContext = {
  readonly context: {
    readonly baseURL: string;
  };
  readonly redirect: (url: string) => unknown;
};

export const emailChangePlugin = {
  id: 'email-change',
  version: '1.0.0',
  endpoints: {
    requestEmailChange,
    verifyEmailChange,
  },
  rateLimit: [
    {
      pathMatcher: (path: string) => path.startsWith('/email-change/request'),
      window: 60 * 5,
      max: 5,
    },
    {
      pathMatcher: (path: string) => path.startsWith('/email-change/verify'),
      window: 60 * 5,
      max: 20,
    },
  ],
} satisfies BetterAuthPlugin;
