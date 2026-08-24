import { isLocale } from '@repo/i18n/config';
import { getTranslations } from '@repo/i18n/server';
import { Link } from '@repo/i18n/navigation';
import { notFound } from 'next/navigation';
import { buttonVariants } from '@repo/ui/button';
import { LaunchRail } from './_components/launch-rail';

type LandingPageProps = {
  readonly params: Promise<{ locale: string }>;
};

export default async function LandingPage({ params }: LandingPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'landing' });

  return (
    <main>
      <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-16 pt-16 sm:px-8 sm:pb-24 sm:pt-24 lg:grid-cols-[minmax(0,1.1fr)_minmax(15rem,0.7fr)] lg:items-end lg:gap-20 lg:px-10">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {t('eyebrow')}
          </p>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            {t('title')}
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {t('lede')}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a className={buttonVariants({ size: 'lg' })} href="#launch-rail">
              {t('primaryCta')}
            </a>
            <Link className={buttonVariants({ size: 'lg', variant: 'secondary' })} href="/terms">
              {t('secondaryCta')}
            </Link>
          </div>
        </div>
        <aside
          className="border-l-2 border-primary py-1 pl-5 sm:pl-7 lg:mb-2"
          aria-label={t('manifestoLabel')}
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {t('manifestoLabel')}
          </p>
          <p className="mt-4 text-xl font-medium leading-8 tracking-tight sm:text-2xl">
            {t('manifestoTitle')}
          </p>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">{t('manifestoBody')}</p>
        </aside>
      </section>

      <div id="launch-rail" className="mx-auto w-full max-w-6xl scroll-mt-8 px-5 sm:px-8 lg:px-10">
        <LaunchRail locale={locale} />
      </div>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-20 lg:px-10">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {t('manifestoLabel')}
          </p>
          <h2 className="mt-4 max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('closingLabel')}
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
            {t('closingBody')}
          </p>
        </div>
        <div className="grid divide-y divide-border border-y border-border">
          <div className="grid gap-2 py-5 sm:grid-cols-[9rem_1fr] sm:gap-8">
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              {t('principles.signal.label')}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">{t('principles.signal.body')}</p>
          </div>
          <div className="grid gap-2 py-5 sm:grid-cols-[9rem_1fr] sm:gap-8">
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              {t('principles.structure.label')}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {t('principles.structure.body')}
            </p>
          </div>
          <div className="grid gap-2 py-5 sm:grid-cols-[9rem_1fr] sm:gap-8">
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              {t('principles.care.label')}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">{t('principles.care.body')}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
