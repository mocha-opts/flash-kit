import { relations, sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './core';

/** Billing providers supported by the active deployment. */
export const billingProviders = ['stripe', 'polar'] as const;

export type BillingProvider = (typeof billingProviders)[number];

/** Purchase kinds represented by the local billing ledger. */
export const billingPurchaseKinds = ['lifetime', 'credit_pack'] as const;

export type BillingPurchaseKind = (typeof billingPurchaseKinds)[number];

/** Provider purchase states retained for refunds and disputes. */
export const billingPurchaseStatuses = [
  'paid',
  'refunded',
  'partially_refunded',
  'disputed',
] as const;

export type BillingPurchaseStatus = (typeof billingPurchaseStatuses)[number];

/** Processing states for the PII-free provider event idempotency ledger. */
export const billingEventStatuses = ['received', 'processed', 'ignored', 'failed'] as const;

export type BillingEventStatus = (typeof billingEventStatuses)[number];

/** Credit ledger transaction kinds. Transactions are append-only. */
export const creditTransactionTypes = ['purchase', 'consumption', 'refund', 'adjustment'] as const;

export type CreditTransactionType = (typeof creditTransactionTypes)[number];

/**
 * A completed one-time order. Provider order identity is unique per provider;
 * no provider payload or user profile data is copied into this table.
 */
export const billingPurchase = pgTable(
  'billing_purchase',
  {
    id: text('id').default(sql`pg_catalog.gen_random_uuid()::text`).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    provider: text('provider', { enum: billingProviders }).notNull(),
    providerOrderId: text('provider_order_id').notNull(),
    providerCheckoutId: text('provider_checkout_id'),
    productId: text('product_id').notNull(),
    planId: text('plan_id').notNull(),
    kind: text('kind', { enum: billingPurchaseKinds }).notNull(),
    status: text('status', { enum: billingPurchaseStatuses }).notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('billing_purchase_provider_order_uidx').on(table.provider, table.providerOrderId),
    index('billing_purchase_user_status_idx').on(table.userId, table.status),
    index('billing_purchase_user_product_idx').on(table.userId, table.productId),
    check('billing_purchase_provider_check', sql`${table.provider} in ('stripe', 'polar')`),
    check('billing_purchase_kind_check', sql`${table.kind} in ('lifetime', 'credit_pack')`),
    check(
      'billing_purchase_status_check',
      sql`${table.status} in ('paid', 'refunded', 'partially_refunded', 'disputed')`,
    ),
    check('billing_purchase_amount_check', sql`${table.amount} >= 0`),
    check(
      'billing_purchase_currency_check',
      sql`${table.currency} ~ '^[a-z]{3}$' and ${table.currency} = lower(${table.currency})`,
    ),
    check('billing_purchase_provider_order_id_check', sql`length(${table.providerOrderId}) > 0`),
    check('billing_purchase_product_id_check', sql`length(${table.productId}) > 0`),
    check('billing_purchase_plan_id_check', sql`length(${table.planId}) > 0`),
  ],
);

/**
 * A provider event idempotency record. It deliberately contains no user id,
 * email, raw payload, or other personal/provider response data.
 */
export const billingEvent = pgTable(
  'billing_event',
  {
    id: text('id').default(sql`pg_catalog.gen_random_uuid()::text`).primaryKey(),
    provider: text('provider', { enum: billingProviders }).notNull(),
    providerEventId: text('provider_event_id').notNull(),
    eventType: text('event_type').notNull(),
    status: text('status', { enum: billingEventStatuses }).notNull().default('received'),
    deliveryCount: integer('delivery_count').notNull().default(1),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow().notNull(),
    lastReceivedAt: timestamp('last_received_at', { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('billing_event_provider_event_uidx').on(table.provider, table.providerEventId),
    check('billing_event_provider_check', sql`${table.provider} in ('stripe', 'polar')`),
    check(
      'billing_event_status_check',
      sql`${table.status} in ('received', 'processed', 'ignored', 'failed')`,
    ),
    check('billing_event_delivery_count_check', sql`${table.deliveryCount} > 0`),
    check('billing_event_provider_event_id_check', sql`length(${table.providerEventId}) > 0`),
    check('billing_event_type_check', sql`length(${table.eventType}) > 0`),
    check(
      'billing_event_error_code_length_check',
      sql`${table.errorCode} is null or length(${table.errorCode}) <= 100`,
    ),
    check(
      'billing_event_error_message_length_check',
      sql`${table.errorMessage} is null or length(${table.errorMessage}) <= 500`,
    ),
  ],
);

/** One mutable balance row per user; negative balances are valid after refunds. */
export const creditAccount = pgTable('credit_account', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

/**
 * Append-only credit ledger. A transaction records the resulting balance so
 * history remains auditable without reconstructing it from later rows.
 */
export const creditTransaction = pgTable(
  'credit_transaction',
  {
    id: text('id').default(sql`pg_catalog.gen_random_uuid()::text`).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type', { enum: creditTransactionTypes }).notNull(),
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    description: text('description').notNull(),
    referenceType: text('reference_type').notNull(),
    referenceId: text('reference_id').notNull(),
    purchaseId: text('purchase_id').references(() => billingPurchase.id, {
      onDelete: 'set null',
    }),
    actorUserId: uuid('actor_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('credit_transaction_reference_uidx').on(
      table.userId,
      table.referenceType,
      table.referenceId,
      table.type,
    ),
    index('credit_transaction_user_created_idx').on(table.userId, table.createdAt),
    index('credit_transaction_purchase_idx').on(table.purchaseId),
    check(
      'credit_transaction_type_check',
      sql`${table.type} in ('purchase', 'consumption', 'refund', 'adjustment')`,
    ),
    check('credit_transaction_amount_check', sql`${table.amount} <> 0`),
    check(
      'credit_transaction_description_check',
      sql`length(${table.description}) > 0 and length(${table.description}) <= 500`,
    ),
    check(
      'credit_transaction_reference_type_check',
      sql`length(${table.referenceType}) > 0 and length(${table.referenceType}) <= 100`,
    ),
    check(
      'credit_transaction_reference_id_check',
      sql`length(${table.referenceId}) > 0 and length(${table.referenceId}) <= 255`,
    ),
  ],
);

/** Purchase-side relation; the event ledger intentionally has no User FK. */
export const billingPurchaseRelations = relations(billingPurchase, ({ one }) => ({
  user: one(user, {
    fields: [billingPurchase.userId],
    references: [user.id],
  }),
}));

export const creditAccountRelations = relations(creditAccount, ({ one }) => ({
  user: one(user, {
    fields: [creditAccount.userId],
    references: [user.id],
  }),
}));

export const creditTransactionRelations = relations(creditTransaction, ({ one }) => ({
  user: one(user, {
    relationName: 'creditTransactionUser',
    fields: [creditTransaction.userId],
    references: [user.id],
  }),
  purchase: one(billingPurchase, {
    fields: [creditTransaction.purchaseId],
    references: [billingPurchase.id],
  }),
  actorUser: one(user, {
    relationName: 'creditTransactionActor',
    fields: [creditTransaction.actorUserId],
    references: [user.id],
  }),
}));
