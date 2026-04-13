import { and, eq, ne } from 'drizzle-orm';

import {
  accounts,
  memberships,
  organizations,
  passkeys,
  sessions,
  twoFactors,
  users,
} from '../schema';
import { deleteOrgInTx } from './delete-org';

export type DeleteUserResult = {
  deletedCounts: {
    sessions: number;
    accounts: number;
    passkeys: number;
    twoFactors: number;
    personalOrg: {
      apiKeys: number;
      invitations: number;
      subscriptions: number;
      memberships: number;
      organizations: number;
    } | null;
    memberships: number;
    users: number;
  };
};

/**
 * Delete a user and all their dependent data in a single transaction.
 *
 * Deletion order (by dependency):
 *   1. sessions
 *   2. accounts
 *   3. passkeys
 *   4. twoFactors
 *   5. personal org cascade (if exists)
 *   6. memberships (from non-personal orgs)
 *   7. user record
 *
 * Guards:
 *   - Throws if user has globalRole = 'super_admin'
 *   - Throws if user is the sole owner of any non-personal organization
 */
export async function deleteUserCascade(
  userId: string,
): Promise<DeleteUserResult> {
  const { db } = await import('../client');

  return db.transaction(async (tx) => {
    // -----------------------------------------------------------------------
    // Pre-flight checks
    // -----------------------------------------------------------------------
    const user = await tx
      .select({ id: users.id, globalRole: users.globalRole })
      .from(users)
      .where(eq(users.id, userId))
      .then((rows) => rows[0]);

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (user.globalRole === 'super_admin') {
      throw new Error('Cannot delete a super_admin user');
    }

    // Find all orgs where this user is an owner
    const ownerships = await tx
      .select({
        orgId: memberships.orgId,
        orgName: organizations.name,
        isPersonal: organizations.isPersonal,
      })
      .from(memberships)
      .innerJoin(organizations, eq(organizations.id, memberships.orgId))
      .where(and(eq(memberships.userId, userId), eq(memberships.role, 'owner')));

    // For each non-personal org, ensure there is at least one other owner
    for (const ownership of ownerships) {
      if (ownership.isPersonal) continue;

      const otherOwners = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(
            eq(memberships.orgId, ownership.orgId),
            eq(memberships.role, 'owner'),
            ne(memberships.userId, userId),
          ),
        );

      if (otherOwners.length === 0) {
        throw new Error(
          `User is the sole owner of organization "${ownership.orgName}" (${ownership.orgId}). Transfer ownership first.`,
        );
      }
    }

    // -----------------------------------------------------------------------
    // 1. Auth-related records
    // -----------------------------------------------------------------------
    const delSessions = await tx
      .delete(sessions)
      .where(eq(sessions.userId, userId))
      .returning({ id: sessions.id });

    const delAccounts = await tx
      .delete(accounts)
      .where(eq(accounts.userId, userId))
      .returning({ id: accounts.id });

    const delPasskeys = await tx
      .delete(passkeys)
      .where(eq(passkeys.userId, userId))
      .returning({ id: passkeys.id });

    const delTwoFactors = await tx
      .delete(twoFactors)
      .where(eq(twoFactors.userId, userId))
      .returning({ id: twoFactors.id });

    // -----------------------------------------------------------------------
    // 2. Personal org cascade
    // -----------------------------------------------------------------------
    const personalOrg = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(
        and(
          eq(organizations.ownerId, userId),
          eq(organizations.isPersonal, true),
        ),
      )
      .then((rows) => rows[0]);

    let personalOrgResult: DeleteUserResult['deletedCounts']['personalOrg'] =
      null;

    if (personalOrg) {
      const orgResult = await deleteOrgInTx(tx, personalOrg.id);
      personalOrgResult = orgResult.deletedCounts;
    }

    // -----------------------------------------------------------------------
    // 3. Remove memberships from non-personal orgs
    // -----------------------------------------------------------------------
    const delMemberships = await tx
      .delete(memberships)
      .where(eq(memberships.userId, userId))
      .returning({ id: memberships.id });

    // -----------------------------------------------------------------------
    // 4. Delete user
    // -----------------------------------------------------------------------
    const delUser = await tx
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    return {
      deletedCounts: {
        sessions: delSessions.length,
        accounts: delAccounts.length,
        passkeys: delPasskeys.length,
        twoFactors: delTwoFactors.length,
        personalOrg: personalOrgResult,
        memberships: delMemberships.length,
        users: delUser.length,
      },
    };
  });
}
