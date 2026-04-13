import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { organizations } from './organizations';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const subStatusEnum = pgEnum('subscription_status', [
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'paused',
  'incomplete',
]);

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orgId: uuid('org_id').notNull(),
    status: subStatusEnum('status').notNull(),
    planId: text('plan_id').notNull(),
    provider: text('provider').notNull(),
    providerSubscriptionId: text('provider_subscription_id').unique(),
    providerCustomerId: text('provider_customer_id'),
    providerItemId: text('provider_item_id'),
    seatsQuantity: integer('seats_qty'),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true, mode: 'date' }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true, mode: 'date' }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    trialEnd: timestamp('trial_end', { withTimezone: true, mode: 'date' }),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).defaultNow(),
  },
  (table) => [
    index('subscriptions_org_id_idx').on(table.orgId),
  ],
);

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.orgId],
    references: [organizations.id],
  }),
}));
