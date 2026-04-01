import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './users';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const orgRoleEnum = pgEnum('org_role', [
  'owner',
  'admin',
  'member',
  'viewer',
]);

export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'expired',
  'revoked',
]);

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    logoUrl: text('logo_url'),
    isPersonal: boolean('is_personal').default(false).notNull(),
    ownerId: uuid('owner_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => [
    index('organizations_owner_id_idx').on(table.ownerId),
  ],
);

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  memberships: many(memberships),
  invitations: many(invitations),
}));

// ---------------------------------------------------------------------------
// Memberships
// ---------------------------------------------------------------------------
export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    orgId: uuid('org_id').notNull(),
    role: orgRoleEnum('role').default('member').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => [
    unique('memberships_user_id_org_id_unique').on(table.userId, table.orgId),
    index('memberships_user_id_idx').on(table.userId),
    index('memberships_org_id_idx').on(table.orgId),
  ],
);

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [memberships.orgId],
    references: [organizations.id],
  }),
}));

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id').notNull(),
    email: text('email').notNull(),
    role: orgRoleEnum('role').default('member').notNull(),
    token: text('token').notNull().unique(),
    status: invitationStatusEnum('status').default('pending').notNull(),
    invitedById: uuid('invited_by_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => [
    index('invitations_org_id_idx').on(table.orgId),
    index('invitations_invited_by_id_idx').on(table.invitedById),
  ],
);

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.orgId],
    references: [organizations.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedById],
    references: [users.id],
  }),
}));
