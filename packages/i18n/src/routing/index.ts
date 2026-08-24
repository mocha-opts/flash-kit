import { defaultLocale, isLocale, localePrefix } from '#config/index';

import type { Locale } from '#config/index';

/** Routing values shared with the web application's locale adapter. */
export type RoutingConfig = {
  readonly locales: readonly Locale[];
  readonly defaultLocale: Locale;
  readonly localePrefix: 'as-needed';
};

/** Canonical routing configuration; the default locale remains unprefixed. */
export const routing: RoutingConfig = {
  locales: ['en', 'zh-CN'],
  defaultLocale,
  localePrefix,
};

/** Reads a supported locale from the first non-empty pathname segment. */
export function getLocaleFromPathname(pathname: string): Locale | null {
  const firstSegment = pathname.split('/').filter(Boolean)[0];

  if (firstSegment !== undefined && isLocale(firstSegment)) {
    return firstSegment;
  }

  return null;
}
