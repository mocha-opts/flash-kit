import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { locales, isLocale, type Locale } from '@repo/i18n/config';
import { I18nProvider } from '@repo/i18n/client';
import { getTranslations, setRequestLocale } from '@repo/i18n/server';
import { ThemeProvider } from '@repo/ui/theme';
import '../globals.css';

export const viewport: Viewport = {
  colorScheme: 'light dark',
};

export function generateStaticParams(): Array<{ locale: Locale }> {
  return locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
};

type LocaleMetadataProps = {
  readonly params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: LocaleMetadataProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    return {};
  }

  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps): Promise<ReactNode> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <I18nProvider locale={locale}>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
