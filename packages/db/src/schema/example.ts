import { relations, sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { user } from './core';

/** The lifecycle states supported by the removable Project example. */
export const projectStatuses = ['active', 'archived'] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

/**
 * Removable, user-owned example table. The text UUID keeps the example aligned
 * with the application contract while userId remains a native UUID FK because
 * Better Auth's generated user table owns that type.
 */
export const project = pgTable(
  'project',
  {
    id: text('id').default(sql`pg_catalog.gen_random_uuid()::text`).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    status: text('status', { enum: projectStatuses }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('project_user_created_idx').on(table.userId, table.createdAt),
    check('project_status_check', sql`${table.status} in ('active', 'archived')`),
  ],
);

/** Project-side relation kept outside Better Auth's generated core schema. */
export const projectRelations = relations(project, ({ one }) => ({
  user: one(user, {
    fields: [project.userId],
    references: [user.id],
  }),
}));
