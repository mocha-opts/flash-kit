import { serverEnv } from '@repo/config/env/server';
import { I18nProvider } from '@repo/i18n/client';
import { defaultLocale, isLocale, type Locale, locales } from '@repo/i18n/config';
import { getMessages, getTranslations, setRequestLocale } from '@repo/i18n/server';
import { ThemeProvider } from '@repo/ui/theme';
import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
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
  const { locale: requestedLocale } = await params;
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;

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
  const { locale: requestedLocale } = await params;
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;

  setRequestLocale(locale);
  const [messages, nonce] = await Promise.all([getMessages(), getStrictCspNonce()]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeProvider {...(nonce ? { nonce } : {})}>
          <I18nProvider locale={locale} messages={messages}>
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

/** Next.js can attach nonces only while dynamically rendering an incoming request. */
async function getStrictCspNonce(): Promise<string | undefined> {
  if (serverEnv.NODE_ENV !== 'production' || !serverEnv.strictCspEnabled) {
    return undefined;
  }

  await connection();
  const nonce = (await headers()).get('x-nonce');

  if (!nonce) {
    throw new Error('Strict CSP is enabled but the request nonce is missing.');
  }

  return nonce;
}
