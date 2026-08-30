import 'server-only';

import { requireAdmin } from '@repo/auth/server';
import { getCreditManagementView } from '@repo/billing/server';
import { z } from 'zod';

const targetUserIdSchema = z.string().uuid();

/** Repeats the Admin guard before any target-user Credit data is queried. */
export async function loadAdminCreditPage(userId: string) {
  await requireAdmin();

  const parsedUserId = targetUserIdSchema.safeParse(userId);

  if (!parsedUserId.success) {
    return null;
  }

  return await getCreditManagementView({ userId: parsedUserId.data, limit: 50 });
}
