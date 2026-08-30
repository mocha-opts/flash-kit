import 'server-only';

import { serverEnv } from '@repo/config/env/server';
import { db } from '@repo/db/client';
import * as schema from '@repo/db/schema';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { authConfig } from '#config/auth-config';
import { adminPlugin } from '#plugins/admin';
import { billingPlugin } from '#plugins/billing';
import { emailChangePlugin } from '#plugins/email-change';
import { magicLinkPlugin } from '#plugins/magic-link';
import { authRateLimit } from '#plugins/rate-limit';
import { socialProviders } from '#plugins/social-providers';

export const auth = betterAuth({
  appName: authConfig.appName,
  baseURL: authConfig.baseURL,
  basePath: authConfig.basePath,
  secret: serverEnv.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
    transaction: true,
  }),
  emailAndPassword: {
    enabled: false,
  },
  user: {
    // Account deletion is available only through the confirmed application action.
    deleteUser: { enabled: false },
  },
  socialProviders,
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
      trustedProviders: ['google', 'github'],
      allowDifferentEmails: false,
      allowUnlinkingAll: false,
      updateUserInfoOnLink: false,
    },
  },
  plugins: [
    adminPlugin,
    magicLinkPlugin,
    emailChangePlugin,
    ...(billingPlugin ? [billingPlugin] : []),
  ],
  session: {
    expiresIn: authConfig.sessionMaxAgeSeconds,
    updateAge: authConfig.sessionUpdateAgeSeconds,
    freshAge: authConfig.sessionFreshAgeSeconds,
    cookieCache: {
      enabled: false,
    },
  },
  verification: {
    storeIdentifier: 'hashed',
    storeInDatabase: true,
  },
  trustedOrigins: [authConfig.baseURL],
  rateLimit: authRateLimit,
  advanced: {
    useSecureCookies: authConfig.secureCookies,
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: authConfig.secureCookies,
      path: '/',
    },
    database: {
      generateId: 'uuid',
    },
  },
});

export type Auth = typeof auth;
