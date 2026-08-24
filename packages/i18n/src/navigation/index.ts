import { defaultLocale } from '#config/index';

import type { Locale } from '#config/index';

/** Inputs for constructing a locale-aware pathname. */
export type LocalizedHrefInput = {
  readonly locale: Locale;
  readonly pathname: string;
};

/** Adds a locale prefix when needed and normalizes the pathname to begin with `/`. */
export function getLocalizedPathname({ locale, pathname }: LocalizedHrefInput): string {
  const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;

  if (locale === defaultLocale) {
    return normalizedPathname;
  }

  return `/${locale}${normalizedPathname}`;
}
