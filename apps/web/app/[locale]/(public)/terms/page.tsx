import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isLocale } from '@repo/i18n/config';
import { getTranslations } from '@repo/i18n/server';
import { LegalPage } from '../_components/legal-page';

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
    <LegalPage
      effectiveDate={t('effectiveDate')}
      eyebrow={t('eyebrow')}
      intro={t('intro')}
      sections={[
        { body: t('useBody'), heading: t('useTitle') },
        { body: t('contentBody'), heading: t('contentTitle') },
        { body: t('ownershipBody'), heading: t('ownershipTitle') },
        { body: t('changesBody'), heading: t('changesTitle') },
      ]}
      title={t('title')}
    />
  );
}
