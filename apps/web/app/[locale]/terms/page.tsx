import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isLocale } from '@repo/i18n/config';
import { getTranslations } from '@repo/i18n/server';

type TermsPageProps = {
  readonly params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'legal.terms' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'legal.terms' });

  return (
    <main>
      <article className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-8 sm:py-24 lg:px-10">
        <header className="max-w-2xl border-b border-border pb-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            {t('eyebrow')}
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">{t('title')}</h1>
          <p className="mt-6 text-base leading-7 text-muted-foreground">{t('intro')}</p>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {t('effectiveDate')}
          </p>
        </header>
        <div className="grid gap-10 pt-10 sm:gap-12 sm:pt-14">
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t('useTitle')}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{t('useBody')}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t('contentTitle')}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              {t('contentBody')}
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t('ownershipTitle')}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              {t('ownershipBody')}
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t('changesTitle')}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              {t('changesBody')}
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
