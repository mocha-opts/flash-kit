import { isLocale } from '@repo/i18n/config';
import { getLocale, getTranslations } from '@repo/i18n/server';
import { Link } from '@repo/i18n/navigation';
import { buttonVariants } from '@repo/ui/button';

export default async function LocaleNotFound() {
  const requestLocale = await getLocale();
  const locale = isLocale(requestLocale) ? requestLocale : 'en';
  const t = await getTranslations({ locale, namespace: 'notFound' });

  return (
    <main className="mx-auto flex min-h-[55vh] w-full max-w-4xl flex-col justify-center px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{t('eyebrow')}</p>
      <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">
        {t('title')}
      </h1>
      <p className="mt-6 max-w-lg text-base leading-7 text-muted-foreground">{t('body')}</p>
      <Link className={`${buttonVariants({ size: 'lg' })} mt-9 w-fit`} href="/">
        {t('back')}
      </Link>
    </main>
  );
}
