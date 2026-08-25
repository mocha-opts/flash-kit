'use server';

import { banAdminUser, revokeAdminUserSessions, unbanAdminUser } from '@repo/auth/server';
import { getLocalizedPathname } from '@repo/i18n/navigation';
import { revalidatePath } from 'next/cache';

import { adminAction } from '@/lib/actions/action-clients';

import { adminUserActionSchema } from '../_schemas/admin-users.schema';

/** Bans a target user; Better Auth also revokes every existing target session. */
export const banUserAction = adminAction
  .inputSchema(adminUserActionSchema)
  .action(async ({ ctx, parsedInput }) => {
    await banAdminUser(parsedInput.userId);

    revalidateAdminUsersPath(ctx.locale);
    return { banned: true };
  });

/** Removes a target user's ban through the Better Auth Admin Plugin. */
export const unbanUserAction = adminAction
  .inputSchema(adminUserActionSchema)
  .action(async ({ ctx, parsedInput }) => {
    await unbanAdminUser(parsedInput.userId);

    revalidateAdminUsersPath(ctx.locale);
    return { banned: false };
  });

/** Revokes all current sessions for a target user through the Better Auth Admin Plugin. */
export const revokeUserSessionsAction = adminAction
  .inputSchema(adminUserActionSchema)
  .action(async ({ ctx, parsedInput }) => {
    await revokeAdminUserSessions(parsedInput.userId);

    revalidateAdminUsersPath(ctx.locale);
    return { revoked: true };
  });

function revalidateAdminUsersPath(locale: Parameters<typeof getLocalizedPathname>[0]['locale']) {
  revalidatePath(getLocalizedPathname({ locale, pathname: '/admin/users' }));
}
