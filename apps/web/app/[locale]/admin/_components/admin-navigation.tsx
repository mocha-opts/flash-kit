import type { Locale } from '@repo/i18n/config';
import { Link } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';

type AdminNavigationProps = {
  readonly locale: Locale;
};

/** Small server-rendered navigation for the separately guarded Admin surface. */
export async function AdminNavigation({ locale }: AdminNavigationProps) {
  const t = await getTranslations({ locale, namespace: 'admin' });

  return (
    <nav aria-label={t('navigation.label')} className="border-b border-border">
      <div className="mx-auto flex w-full max-w-6xl min-w-0 flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 sm:px-8 lg:px-10">
        <Link
          className="mr-auto font-mono text-xs uppercase tracking-[0.16em] text-primary"
          href="/admin/users"
          locale={locale}
        >
          {t('navigation.brand')}
        </Link>
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link
            className="rounded-sm px-1 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/dashboard"
            locale={locale}
          >
            {t('navigation.dashboard')}
          </Link>
          <Link
            className="rounded-sm px-1 py-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            href="/admin/users"
            locale={locale}
          >
            {t('navigation.users')}
          </Link>
        </div>
      </div>
    </nav>
  );
}
