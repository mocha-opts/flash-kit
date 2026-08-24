'use client';

import { NextIntlClientProvider, useLocale } from 'next-intl';
import { type ComponentProps, createElement, type ReactNode } from 'react';

import { isLocale, type Locale } from '#config/index';

/** Props for a client-side locale provider boundary. */
export type I18nProviderProps = Omit<ComponentProps<typeof NextIntlClientProvider>, 'locale'> & {
  readonly locale: Locale;
};

/** Client provider boundary; product messages remain owned by the consuming app. */
export type I18nProvider = (props: I18nProviderProps) => ReactNode;

/** Client adapter for next-intl's provider, without a server runtime dependency. */
export const I18nProvider: I18nProvider = ({ locale, ...props }) =>
  createElement(NextIntlClientProvider, { locale, ...props });

/** Returns the active locale and rejects an invalid next-intl runtime value. */
export function useCurrentLocale(): Locale {
  const locale = useLocale();

  if (!isLocale(locale)) {
    throw new Error(
      `@repo/i18n: next-intl returned unsupported locale "${locale}". Expected "en" or "zh-CN".`,
    );
  }

  return locale;
}
