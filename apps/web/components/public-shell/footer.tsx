import { Link } from '@repo/i18n/navigation';
import type { Locale } from '@repo/i18n/config';
import { getTranslations } from '@repo/i18n/server';

type PublicFooterProps = {
  readonly locale: Locale;
};

/** Public footer with only product-owned policy links. */
export async function PublicFooter({ locale }: PublicFooterProps) {
  const t = await getTranslations({ locale, namespace: 'footer' });
  const brand = await getTranslations({ locale, namespace: 'brand' });

  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:px-10">
        <div>
          <p className="text-sm font-semibold tracking-tight">{brand('name')}</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{t('note')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link
            className="rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href="/pricing"
          >
            {t('pricing')}
          </Link>
          <Link
            className="rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href="/privacy"
          >
            {t('privacy')}
          </Link>
          <Link
            className="rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href="/terms"
          >
            {t('terms')}
          </Link>
          <span className="text-muted-foreground">{t('copyright')}</span>
        </div>
      </div>
    </footer>
  );
}
