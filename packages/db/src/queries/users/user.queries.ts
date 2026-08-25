import 'server-only';

import { and, asc, count, desc, eq, gt, ilike, isNull, ne, not, or, sql } from 'drizzle-orm';
import { db } from '#db/client/index';
import { session, user } from '#db/schema/index';

export type AdminUserRoleFilter = 'all' | 'admin' | 'user';
export type AdminUserStatusFilter = 'all' | 'active' | 'banned';
export type AdminUserRole = 'admin' | 'user';

export type AdminUserListFilters = {
  readonly search?: string;
  readonly role?: AdminUserRoleFilter;
  readonly status?: AdminUserStatusFilter;
  readonly limit: number;
  readonly offset: number;
};

export type AdminUserRecord = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: AdminUserRole;
  readonly banned: boolean;
  readonly banReason: string | null;
  readonly banExpires: Date | null;
  readonly createdAt: Date;
};

export type AdminUserListPage = {
  readonly users: AdminUserRecord[];
  readonly total: number;
};

export type UserSessionRecord = {
  readonly id: string;
  readonly token: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
};

/** Lists users for an already-authorized admin route without using Better Auth's swallowed errors. */
export async function listUsersForAdmin(filters: AdminUserListFilters): Promise<AdminUserListPage> {
  const predicates = [];
  const search = filters.search?.trim();

  if (search) {
    const pattern = `%${search}%`;
    predicates.push(or(ilike(user.name, pattern), ilike(user.email, pattern)));
  }

  if (filters.role === 'admin') {
    predicates.push(hasRoleToken('admin'));
  } else if (filters.role === 'user') {
    predicates.push(not(hasRoleToken('admin')));
  }

  if (filters.status === 'banned') {
    predicates.push(eq(user.banned, true));
  } else if (filters.status === 'active') {
    predicates.push(or(eq(user.banned, false), isNull(user.banned)));
  }

  const where = predicates.length > 0 ? and(...predicates) : undefined;
  const [users, totalRows] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: classifyRole(),
        banned: user.banned,
        banReason: user.banReason,
        banExpires: user.banExpires,
        createdAt: user.createdAt,
      })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt), asc(user.id))
      .limit(filters.limit)
      .offset(filters.offset),
    db.select({ count: count() }).from(user).where(where),
  ]);

  return {
    users: users.map((record) => ({
      ...record,
      banned: record.banned ?? false,
      banReason: record.banReason ?? null,
      banExpires: record.banExpires ?? null,
    })),
    total: Number(totalRows[0]?.count ?? 0),
  };
}

function hasRoleToken(role: 'admin' | 'user') {
  const pattern = `(^|,)[[:space:]]*${role}[[:space:]]*(,|$)`;

  return sql<boolean>`coalesce(${user.role}, '') ~ ${pattern}`;
}

function classifyRole() {
  return sql<AdminUserRole>`case when ${hasRoleToken('admin')} then 'admin' else 'user' end`;
}

/** Updates the Better Auth user display name; no parallel profile row is created. */
export async function updateUserDisplayName(userId: string, name: string): Promise<boolean> {
  const rows = await db
    .update(user)
    .set({ name, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning({ id: user.id });

  return rows.length > 0;
}

/** Returns active sessions owned by the trusted user id, with token kept server-side. */
export async function listActiveUserSessions(userId: string): Promise<UserSessionRecord[]> {
  return await db
    .select({
      id: session.id,
      token: session.token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    })
    .from(session)
    .where(and(eq(session.userId, userId), gt(session.expiresAt, new Date())))
    .orderBy(desc(session.updatedAt), desc(session.createdAt));
}

/** Revokes one session only when the SQL predicate proves it belongs to userId. */
export async function revokeUserSession(userId: string, sessionId: string): Promise<boolean> {
  const rows = await db
    .delete(session)
    .where(and(eq(session.id, sessionId), eq(session.userId, userId)))
    .returning({ id: session.id });

  return rows.length > 0;
}

/** Revokes all sessions for a user except the trusted current session token. */
export async function revokeOtherUserSessions(
  userId: string,
  currentSessionToken: string,
): Promise<number> {
  const rows = await db
    .delete(session)
    .where(and(eq(session.userId, userId), ne(session.token, currentSessionToken)))
    .returning({ id: session.id });

  return rows.length;
}
