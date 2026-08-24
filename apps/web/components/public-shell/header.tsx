import type { Locale } from '@repo/i18n/config';
import { Link } from '@repo/i18n/navigation';
import { getTranslations } from '@repo/i18n/server';
import { buttonVariants } from '@repo/ui/button';
import { Suspense } from 'react';
import { LocaleSwitcher, LocaleSwitcherFallback } from '@/components/public-shell/locale-switcher';
import { MobileNavigation } from '@/components/public-shell/mobile-navigation';
import { ThemeSwitcher } from '@/components/public-shell/theme-switcher';

type PublicHeaderProps = {
  readonly locale: Locale;
};

/** Server-rendered navigation with client leaves for locale, theme, and mobile interaction. */
export async function PublicHeader({ locale }: PublicHeaderProps) {
  const t = await getTranslations({ locale, namespace: 'nav' });
  const brand = await getTranslations({ locale, namespace: 'brand' });

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="group inline-flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-sm border border-primary font-mono text-xs font-semibold tracking-tight text-primary transition-colors group-hover:bg-accent motion-reduce:transition-none"
          >
            FK
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight">
              {brand('name')}
            </span>
            <span className="hidden truncate text-xs text-muted-foreground sm:block">
              {brand('tagline')}
            </span>
          </span>
        </Link>

        <nav aria-label={t('menuTitle')} className="hidden items-center gap-1 md:flex">
          <Link className={buttonVariants({ size: 'sm', variant: 'ghost' })} href="/">
            {t('home')}
          </Link>
          <Link className={buttonVariants({ size: 'sm', variant: 'ghost' })} href="/privacy">
            {t('privacy')}
          </Link>
          <Link className={buttonVariants({ size: 'sm', variant: 'ghost' })} href="/terms">
            {t('terms')}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <Suspense fallback={<LocaleSwitcherFallback label={t('language')} locale={locale} />}>
            <LocaleSwitcher
              chineseLabel={t('chinese')}
              englishLabel={t('english')}
              label={t('language')}
              locale={locale}
            />
          </Suspense>
          <ThemeSwitcher
            darkLabel={t('dark')}
            label={t('theme')}
            lightLabel={t('light')}
            systemLabel={t('system')}
          />
          <MobileNavigation
            closeLabel={t('closeMenu')}
            description={t('menuDescription')}
            links={[
              { href: '/', label: t('home') },
              { href: '/privacy', label: t('privacy') },
              { href: '/terms', label: t('terms') },
            ]}
            locale={locale}
            menuLabel={t('menuTitle')}
            openLabel={t('openMenu')}
          />
        </div>
      </div>
    </header>
  );
}
