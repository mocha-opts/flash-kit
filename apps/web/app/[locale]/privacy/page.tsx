import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isLocale } from '@repo/i18n/config';
import { getTranslations } from '@repo/i18n/server';

type PrivacyPageProps = {
  readonly params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'legal.privacy' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: 'legal.privacy' });

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
            <h2 className="text-xl font-semibold tracking-tight">{t('collectionTitle')}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              {t('collectionBody')}
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t('useTitle')}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{t('useBody')}</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t('sharingTitle')}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              {t('sharingBody')}
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
