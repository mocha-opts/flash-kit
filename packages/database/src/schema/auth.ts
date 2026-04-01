import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './users';

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    token: text('token').notNull().unique(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
  ],
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Accounts (OAuth providers)
// ---------------------------------------------------------------------------
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => [
    index('accounts_user_id_idx').on(table.userId),
  ],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Verifications (email verification, magic link, password reset)
// ---------------------------------------------------------------------------
export const verifications = pgTable('verifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
});

// ---------------------------------------------------------------------------
// Passkeys (WebAuthn)
// ---------------------------------------------------------------------------
export const passkeys = pgTable(
  'passkeys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    credentialId: text('credential_id').notNull().unique(),
    publicKey: text('public_key').notNull(),
    counter: text('counter').notNull(),
    deviceType: text('device_type'),
    name: text('name'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => [
    index('passkeys_user_id_idx').on(table.userId),
  ],
);

export const passkeysRelations = relations(passkeys, ({ one }) => ({
  user: one(users, {
    fields: [passkeys.userId],
    references: [users.id],
  }),
}));

// ---------------------------------------------------------------------------
// Two-Factor Authentication (TOTP)
// ---------------------------------------------------------------------------
export const twoFactors = pgTable(
  'two_factors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    enabled: boolean('enabled').default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => [
    index('two_factors_user_id_idx').on(table.userId),
  ],
);

export const twoFactorsRelations = relations(twoFactors, ({ one }) => ({
  user: one(users, {
    fields: [twoFactors.userId],
    references: [users.id],
  }),
}));
