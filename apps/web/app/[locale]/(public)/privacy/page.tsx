import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { isLocale } from '@repo/i18n/config';
import { getTranslations } from '@repo/i18n/server';
import { LegalPage } from '../_components/legal-page';

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
    <LegalPage
      effectiveDate={t('effectiveDate')}
      eyebrow={t('eyebrow')}
      intro={t('intro')}
      sections={[
        { body: t('collectionBody'), heading: t('collectionTitle') },
        { body: t('useBody'), heading: t('useTitle') },
        { body: t('sharingBody'), heading: t('sharingTitle') },
        { body: t('changesBody'), heading: t('changesTitle') },
      ]}
      title={t('title')}
    />
  );
}
