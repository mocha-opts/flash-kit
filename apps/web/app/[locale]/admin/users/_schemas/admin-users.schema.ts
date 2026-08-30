import { z } from 'zod';

export const adminUserRoles = ['all', 'admin', 'user'] as const;
export const adminUserStatuses = ['all', 'active', 'banned'] as const;

export type AdminUserRole = (typeof adminUserRoles)[number];
export type AdminUserStatus = (typeof adminUserStatuses)[number];

function firstQueryValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

const searchQuerySchema = z.preprocess(
  firstQueryValue,
  z.string().trim().max(100, { error: 'searchTooLong' }).catch(''),
);

/** URL contract for the Admin User list; invalid values safely use bounded defaults. */
export const adminUsersSearchParamsSchema = z.object({
  search: searchQuerySchema,
  role: z.preprocess(firstQueryValue, z.enum(adminUserRoles).catch('all')),
  status: z.preprocess(firstQueryValue, z.enum(adminUserStatuses).catch('all')),
  limit: z.preprocess(firstQueryValue, z.coerce.number().int().min(1).max(100).catch(25)),
  offset: z.preprocess(firstQueryValue, z.coerce.number().int().min(0).catch(0)),
});

/** Search/filter form contract used by the interactive client leaf. */
export const adminUserFilterFormSchema = z.strictObject({
  search: z.string().trim().max(100, { error: 'searchTooLong' }),
  role: z.enum(adminUserRoles),
  status: z.enum(adminUserStatuses),
  limit: z.number().int().min(1).max(100),
});

/** Target-user contract shared by all Admin Server Actions. */
export const adminUserActionSchema = z.strictObject({
  userId: z.string().uuid({ error: 'userInvalid' }),
});

export type AdminUsersSearchParams = z.input<typeof adminUsersSearchParamsSchema>;
export type AdminUserFilters = z.output<typeof adminUsersSearchParamsSchema>;
export type AdminUserFilterFormInput = z.input<typeof adminUserFilterFormSchema>;
