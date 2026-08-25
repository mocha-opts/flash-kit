import { getUser } from '@repo/auth/server';
import { findProjectForUser } from '@repo/db/queries/example';
import { isLocale, type Locale } from '@repo/i18n/config';
import { getLocalizedPathname, Link } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { notFound, redirect } from 'next/navigation';

import { ProjectForm } from '../_components/project-form';
import { formatProjectDate } from '../projects-date';
import { ProjectLifecycleActions } from './_components/project-lifecycle-actions';

type ProjectDetailsPageProps = {
  readonly params: Promise<{ locale: string; projectId: string }>;
};

/** Server-rendered Project details/edit surface guarded by the trusted user id. */
export default async function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const { locale: requestedLocale, projectId } = await params;

  if (!isLocale(requestedLocale)) {
    notFound();
  }
  const locale: Locale = requestedLocale;

  const user = await getUser();

  if (!user) {
    redirect(getLocalizedPathname({ locale, pathname: '/auth/sign-in' }));
  }

  const [project, t] = await Promise.all([
    findProjectForUser({ projectId, userId: user.id }),
    getTranslations({ locale, namespace: 'projects' }),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-4xl min-w-0 px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
      <Link
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href="/projects"
        locale={locale}
      >
        ← {t('backToList')}
      </Link>

      <header className="mt-8 min-w-0 border-b border-border pb-8">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {t('eyebrow')}
          </p>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {t(`status.${project.status}`)}
          </span>
        </div>
        <h1 className="mt-5 break-words text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
          {project.name}
        </h1>
        <p className="mt-4 break-words text-base leading-7 text-muted-foreground">
          {project.description || t('noDescription')}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t('createdAt')}:</span>{' '}
          <time dateTime={project.createdAt.toISOString()}>
            {formatProjectDate(project.createdAt, locale)}
          </time>
        </p>
      </header>

      <section
        aria-labelledby="edit-project-title"
        className="mt-8 grid gap-6 border-b border-border pb-8 sm:mt-10 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] sm:gap-10"
      >
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]" id="edit-project-title">
            {t('editTitle')}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{t('editDescription')}</p>
        </div>
        <ProjectForm
          initialDescription={project.description}
          initialName={project.name}
          mode="edit"
          projectId={project.id}
        />
      </section>

      <div className="mt-8">
        <ProjectLifecycleActions projectId={project.id} status={project.status} />
      </div>
    </main>
  );
}
