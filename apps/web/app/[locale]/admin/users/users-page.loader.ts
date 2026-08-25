import 'server-only';

import { requireAdmin } from '@repo/auth/server';
import { listUsersForAdmin } from '@repo/db/queries/users';

import { adminUsersSearchParamsSchema, type AdminUserFilters } from './_schemas/admin-users.schema';

/** Parses URL input once at the route boundary and keeps pagination bounded. */
export function parseAdminUsersSearchParams(searchParams: unknown): AdminUserFilters {
  return adminUsersSearchParamsSchema.parse(searchParams);
}

/** Loads user data only after an independent Admin guard has succeeded. */
export async function loadAdminUsersPage(filters: AdminUserFilters) {
  await requireAdmin();

  return {
    filters,
    page: await listUsersForAdmin(filters),
  };
}
