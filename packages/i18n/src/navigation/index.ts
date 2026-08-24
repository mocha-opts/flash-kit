import { defaultLocale } from '#config/index';

import type { Locale } from '#config/index';

export type LocalizedHrefInput = {
  readonly locale: Locale;
  readonly pathname: string;
};

export function getLocalizedPathname({ locale, pathname }: LocalizedHrefInput): string {
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (locale === defaultLocale) {
    return normalizedPathname;
  }

  return `/${locale}${normalizedPathname}`;
}
