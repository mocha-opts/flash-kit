import { relations } from 'drizzle-orm';
import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { accounts, passkeys, sessions, twoFactors } from './auth';
import { memberships, organizations } from './organizations';

export const globalRoleEnum = pgEnum('global_role', [
  'user',
  'admin',
  'super_admin',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  emailVerified: boolean('email_verified').default(false),
  globalRole: globalRoleEnum('global_role').default('user').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  passkeys: many(passkeys),
  twoFactors: many(twoFactors),
  memberships: many(memberships),
  ownedOrganizations: many(organizations),
}));
