import type { ExtractTablesWithRelations } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';

import type * as schema from '../schema';
import {
  apiKeys,
  invitations,
  memberships,
  organizations,
  subscriptions,
} from '../schema';

type Tx = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type DeleteOrgResult = {
  deletedCounts: {
    apiKeys: number;
    invitations: number;
    subscriptions: number;
    memberships: number;
    organizations: number;
  };
};

/**
 * Internal implementation that runs within an existing transaction.
 * Used by deleteUserCascade to inline org deletion in the same tx.
 */
export async function deleteOrgInTx(
  tx: Tx,
  orgId: string,
): Promise<DeleteOrgResult> {
  const delApiKeys = await tx
    .delete(apiKeys)
    .where(eq(apiKeys.orgId, orgId))
    .returning({ id: apiKeys.id });

  const delInvitations = await tx
    .delete(invitations)
    .where(eq(invitations.orgId, orgId))
    .returning({ id: invitations.id });

  const delSubscriptions = await tx
    .delete(subscriptions)
    .where(eq(subscriptions.orgId, orgId))
    .returning({ id: subscriptions.id });

  const delMemberships = await tx
    .delete(memberships)
    .where(eq(memberships.orgId, orgId))
    .returning({ id: memberships.id });

  const delOrg = await tx
    .delete(organizations)
    .where(eq(organizations.id, orgId))
    .returning({ id: organizations.id });

  return {
    deletedCounts: {
      apiKeys: delApiKeys.length,
      invitations: delInvitations.length,
      subscriptions: delSubscriptions.length,
      memberships: delMemberships.length,
      organizations: delOrg.length,
    },
  };
}

/**
 * Delete an organization and all its dependent data in a single transaction.
 *
 * Deletion order (by dependency):
 *   1. apiKeys
 *   2. invitations
 *   3. subscriptions
 *   4. memberships
 *   5. organizations
 *
 * Does NOT cancel Stripe subscriptions — the caller is responsible for
 * cancelling any active Stripe subscription before calling this function.
 */
export async function deleteOrganizationCascade(
  orgId: string,
): Promise<DeleteOrgResult> {
  // Lazy import to avoid circular dependency at module load time
  const { db } = await import('../client');
  return db.transaction((tx) => deleteOrgInTx(tx, orgId));
}
