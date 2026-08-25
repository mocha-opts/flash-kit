import { getUser } from '@repo/auth/server';
import { isLocale, type Locale } from '@repo/i18n/config';
import { getLocalizedPathname, Link } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { buttonVariants } from '@repo/ui/button';
import { notFound, redirect } from 'next/navigation';

import { ProjectForm } from './_components/project-form';
import type { ProjectStatusFilter } from './_schemas/project.schema';
import { formatProjectDate } from './projects-date';
import { loadProjectsPage, type ProjectPageSearchParams } from './projects-page.loader';

type ProjectsPageProps = {
  readonly params: Promise<{ locale: string }>;
  readonly searchParams: Promise<ProjectPageSearchParams>;
};

/** Server-first user-scoped Project list and create surface. */
export default async function ProjectsPage({ params, searchParams }: ProjectsPageProps) {
  const { locale: requestedLocale } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }
  const locale: Locale = requestedLocale;

  const user = await getUser();

  if (!user) {
    redirect(getLocalizedPathname({ locale, pathname: '/auth/sign-in' }));
  }

  const [data, t] = await Promise.all([
    loadProjectsPage(user.id, await searchParams),
    getTranslations({ locale, namespace: 'projects' }),
  ]);
  const { filters, page } = data;

  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <header className="max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{t('eyebrow')}</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">{t('title')}</h1>
        <p className="mt-6 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          {t('description')}
        </p>
      </header>

      {filters.notice ? (
        <p
          aria-live="polite"
          className="mt-8 border-y border-border py-4 text-sm text-primary"
          role="status"
        >
          {getNoticeMessage(filters.notice, t)}
        </p>
      ) : null}

      <section
        aria-labelledby="create-project-title"
        className="mt-10 grid gap-6 border-y border-border py-8 sm:mt-14 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:gap-10 sm:py-10"
      >
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]" id="create-project-title">
            {t('createTitle')}
          </h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            {t('createDescription')}
          </p>
        </div>
        <ProjectForm mode="create" />
      </section>

      <section aria-labelledby="project-list-title" className="mt-10 min-w-0 sm:mt-14">
        <div className="flex min-w-0 flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.03em]" id="project-list-title">
              {t('listTitle')}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('listCount', { count: page.total })}
            </p>
          </div>
          <ProjectFilters locale={locale} limit={filters.limit} status={filters.status} t={t} />
        </div>

        {page.projects.length === 0 ? (
          <div className="mt-8 border border-dashed border-border px-5 py-10 text-center sm:px-8">
            <h3 className="text-lg font-medium">{t('empty.title')}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {t('empty.description')}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid min-w-0 gap-3">
            {page.projects.map((project) => (
              <article
                className="grid min-w-0 gap-4 border border-border p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6"
                key={project.id}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h3 className="min-w-0 break-words text-lg font-semibold">
                      <Link
                        className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        href={`/projects/${project.id}`}
                        locale={locale}
                      >
                        {project.name}
                      </Link>
                    </h3>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                      {t(`status.${project.status}`)}
                    </span>
                  </div>
                  <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                    {project.description || t('noDescription')}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{t('createdAt')}:</span>{' '}
                    <time dateTime={project.createdAt.toISOString()}>
                      {formatProjectDate(project.createdAt, locale)}
                    </time>
                  </p>
                </div>
                <Link
                  className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} w-fit max-w-full`}
                  href={`/projects/${project.id}`}
                  locale={locale}
                >
                  {t('view')}
                </Link>
              </article>
            ))}
          </div>
        )}

        <ProjectPagination
          locale={locale}
          limit={filters.limit}
          page={page.page}
          totalPages={page.totalPages}
          status={filters.status}
          t={t}
        />
      </section>
    </main>
  );
}

type ProjectsTranslation = Awaited<ReturnType<typeof import('@repo/i18n/server').getTranslations>>;

type ProjectFiltersProps = {
  readonly locale: Locale;
  readonly limit: number;
  readonly status: ProjectStatusFilter;
  readonly t: ProjectsTranslation;
};

function ProjectFilters({ locale, limit, status, t }: ProjectFiltersProps) {
  return (
    <nav aria-label={t('filters.label')} className="flex max-w-full flex-wrap gap-2">
      {(['all', 'active', 'archived'] as const).map((filter) => (
        <Link
          aria-current={status === filter ? 'page' : undefined}
          className={buttonVariants({
            variant: status === filter ? 'primary' : 'ghost',
            size: 'sm',
          })}
          href={`/projects?status=${filter}&page=1&limit=${limit}`}
          key={filter}
          locale={locale}
        >
          {t(`filters.${filter}`)}
        </Link>
      ))}
    </nav>
  );
}

type ProjectPaginationProps = {
  readonly locale: Locale;
  readonly limit: number;
  readonly page: number;
  readonly status: ProjectStatusFilter;
  readonly totalPages: number;
  readonly t: ProjectsTranslation;
};

function ProjectPagination({ locale, limit, page, status, totalPages, t }: ProjectPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const previousPage = page - 1;
  const nextPage = page + 1;
  const query = (targetPage: number) =>
    `/projects?status=${status}&page=${targetPage}&limit=${limit}`;

  return (
    <nav aria-label={t('pagination.label')} className="mt-8 flex flex-wrap items-center gap-3">
      {previousPage >= 1 ? (
        <Link
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          href={query(previousPage)}
          locale={locale}
        >
          {t('pagination.previous')}
        </Link>
      ) : null}
      <span className="text-sm text-muted-foreground">
        {t('pagination.page', { page, totalPages })}
      </span>
      {nextPage <= totalPages ? (
        <Link
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          href={query(nextPage)}
          locale={locale}
        >
          {t('pagination.next')}
        </Link>
      ) : null}
    </nav>
  );
}

function getNoticeMessage(
  notice: 'created' | 'saved' | 'archived' | 'restored' | 'deleted',
  t: ProjectsTranslation,
): string {
  return t(`notice.${notice}`);
}
