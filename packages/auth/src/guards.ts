import { eq, and } from 'drizzle-orm';

import { getCurrentUser } from './session';
import { db } from '@flash-kit/database/client';
import { memberships, users } from '@flash-kit/database/schema';

export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export class AuthError extends Error {
  code: 'UNAUTHORIZED' | 'FORBIDDEN';

  constructor(code: 'UNAUTHORIZED' | 'FORBIDDEN', message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export async function requireOrgRole(
  orgId: string,
  allowedRoles: OrgRole[],
) {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError('UNAUTHORIZED', 'Authentication required');
  }

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, user.id),
      eq(memberships.orgId, orgId),
    ),
  });

  if (!membership) {
    throw new AuthError('FORBIDDEN', 'Not a member of this organization');
  }

  if (!allowedRoles.includes(membership.role as OrgRole)) {
    throw new AuthError('FORBIDDEN', 'Insufficient permissions');
  }

  return { user, membership };
}

export async function requireSuperAdmin() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    throw new AuthError('UNAUTHORIZED', 'Authentication required');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, sessionUser.id),
  });

  if (!user || user.globalRole !== 'super_admin') {
    throw new AuthError('FORBIDDEN', 'Super admin access required');
  }

  return user;
}
