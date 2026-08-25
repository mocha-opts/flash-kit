import 'server-only';

import { and, desc, eq, gt, ne } from 'drizzle-orm';
import { db } from '#db/client/index';
import { session, user } from '#db/schema/index';

export type UserSessionRecord = {
  readonly id: string;
  readonly token: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date | null;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
};

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
