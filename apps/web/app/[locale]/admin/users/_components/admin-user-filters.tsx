'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { usePathname, useRouter } from '@repo/i18n/navigation';
import { buttonVariants } from '@repo/ui/button';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';

import {
  type AdminUserFilterFormInput,
  adminUserFilterFormSchema,
  adminUserRoles,
  adminUserStatuses,
} from '../_schemas/admin-users.schema';

type AdminUserFiltersProps = {
  readonly initialValues: AdminUserFilterFormInput;
};

/** Client leaf for bounded URL search/filter input; server loader validates again. */
export function AdminUserFilters({ initialValues }: AdminUserFiltersProps) {
  const t = useTranslations('admin.users');
  const pathname = usePathname();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminUserFilterFormInput>({
    defaultValues: initialValues,
    mode: 'onBlur',
    resolver: zodResolver(adminUserFilterFormSchema),
  });

  const onSubmit = handleSubmit((values) => {
    const params = new URLSearchParams();
    if (values.search) params.set('search', values.search);
    if (values.role !== 'all') params.set('role', values.role);
    if (values.status !== 'all') params.set('status', values.status);
    params.set('limit', String(values.limit));
    params.set('offset', '0');
    router.push(`${pathname}?${params.toString()}`);
  });

  const searchError =
    errors.search?.message === 'searchTooLong' ? t('filters.searchTooLong') : null;

  return (
    <form className="grid min-w-0 gap-4" noValidate onSubmit={onSubmit}>
      <div className="grid min-w-0 gap-2">
        <label className="text-sm font-medium" htmlFor="admin-user-search">
          {t('filters.searchLabel')}
        </label>
        <input
          {...register('search')}
          aria-describedby={searchError ? 'admin-user-search-error' : undefined}
          aria-invalid={searchError ? 'true' : 'false'}
          className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          id="admin-user-search"
          placeholder={t('filters.searchPlaceholder')}
          type="search"
        />
        {searchError ? (
          <p className="text-sm text-destructive" id="admin-user-search-error" role="alert">
            {searchError}
          </p>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-3">
        <label className="grid min-w-0 gap-2 text-sm font-medium" htmlFor="admin-user-role">
          {t('filters.roleLabel')}
          <select
            {...register('role')}
            className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            id="admin-user-role"
          >
            {adminUserRoles.map((role) => (
              <option key={role} value={role}>
                {t(`roles.${role}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium" htmlFor="admin-user-status">
          {t('filters.statusLabel')}
          <select
            {...register('status')}
            className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            id="admin-user-status"
          >
            {adminUserStatuses.map((status) => (
              <option key={status} value={status}>
                {t(`statuses.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid min-w-0 gap-2 text-sm font-medium" htmlFor="admin-user-limit">
          {t('filters.limitLabel')}
          <select
            {...register('limit', { valueAsNumber: true })}
            className="h-11 min-w-0 rounded-md border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            id="admin-user-limit"
          >
            {!standardPageSizes.includes(initialValues.limit) ? (
              <option value={initialValues.limit}>{initialValues.limit}</option>
            ) : null}
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className={`${buttonVariants({ size: 'md' })} w-fit`}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? t('filters.applying') : t('filters.apply')}
        </button>
        <p className="text-xs text-muted-foreground">{t('filters.hint')}</p>
      </div>
    </form>
  );
}

const standardPageSizes: readonly number[] = [25, 50, 100];
