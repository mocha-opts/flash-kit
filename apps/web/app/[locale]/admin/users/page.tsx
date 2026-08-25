import { isLocale, type Locale } from '@repo/i18n/config';
import { Link } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { buttonVariants } from '@repo/ui/button';
import { notFound } from 'next/navigation';

import { AdminUserFilters } from './_components/admin-user-filters';
import { AdminUsersTable, type AdminUserView } from './_components/admin-users-table';
import { loadAdminUsersPage, parseAdminUsersSearchParams } from './users-page.loader';

type AdminUsersPageProps = {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Server-first Admin User list; the route loader repeats the Admin guard before querying. */
export default async function AdminUsersPage({ params, searchParams }: AdminUsersPageProps) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }

  const locale: Locale = requestedLocale;
  const filters = parseAdminUsersSearchParams(await searchParams);
  const [{ page }, t] = await Promise.all([
    loadAdminUsersPage(filters),
    getTranslations({ locale, namespace: 'admin' }),
  ]);
  const users: AdminUserView[] = page.users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    banned: user.banned,
    banReason: user.banReason,
    banExpires: user.banExpires?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  }));
  const currentPage = Math.floor(filters.offset / filters.limit) + 1;
  const totalPages = Math.max(1, Math.ceil(page.total / filters.limit));

  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <header className="flex min-w-0 flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {t('users.eyebrow')}
          </p>
          <h1 className="mt-5 break-words text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            {t('users.title')}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {t('users.description')}
          </p>
        </div>
        <Link
          className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} w-fit max-w-full`}
          href="/dashboard"
          locale={locale}
        >
          {t('users.backToDashboard')}
        </Link>
      </header>

      <section aria-labelledby="admin-user-filters-title" className="border-b border-border py-8">
        <h2 className="sr-only" id="admin-user-filters-title">
          {t('users.filters.title')}
        </h2>
        <AdminUserFilters
          initialValues={{
            search: filters.search,
            role: filters.role,
            status: filters.status,
            limit: filters.limit,
          }}
        />
      </section>

      <section aria-labelledby="admin-user-list-title" className="min-w-0 py-8">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em]" id="admin-user-list-title">
              {t('users.listTitle')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('users.listCount', { count: page.total })}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('users.pagination.page', { page: currentPage, totalPages })}
          </p>
        </div>

        <AdminUsersTable locale={locale} users={users} />

        <AdminUsersPagination
          currentPage={currentPage}
          filters={filters}
          locale={locale}
          t={t}
          totalPages={totalPages}
        />
      </section>
    </main>
  );
}

type AdminUsersPaginationProps = {
  readonly currentPage: number;
  readonly filters: ReturnType<typeof parseAdminUsersSearchParams>;
  readonly locale: Locale;
  readonly t: Awaited<ReturnType<typeof import('@repo/i18n/server').getTranslations>>;
  readonly totalPages: number;
};

function AdminUsersPagination({
  currentPage,
  filters,
  locale,
  t,
  totalPages,
}: AdminUsersPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const query = (offset: number) => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.role !== 'all') params.set('role', filters.role);
    if (filters.status !== 'all') params.set('status', filters.status);
    params.set('limit', String(filters.limit));
    params.set('offset', String(offset));
    return `/admin/users?${params.toString()}`;
  };

  return (
    <nav
      aria-label={t('users.pagination.label')}
      className="mt-8 flex flex-wrap items-center gap-3"
    >
      {currentPage > 1 ? (
        <Link
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          href={query(Math.max(0, filters.offset - filters.limit))}
          locale={locale}
        >
          {t('users.pagination.previous')}
        </Link>
      ) : null}
      {currentPage < totalPages ? (
        <Link
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          href={query(filters.offset + filters.limit)}
          locale={locale}
        >
          {t('users.pagination.next')}
        </Link>
      ) : null}
    </nav>
  );
}
