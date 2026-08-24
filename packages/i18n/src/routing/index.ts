import { defineRouting } from 'next-intl/routing';
import type { Locale } from '#config/index';
import { defaultLocale, isLocale, localeCookieName, localePrefix, locales } from '#config/index';

/** Canonical next-intl routing configuration; the default locale remains unprefixed. */
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix,
  localeCookie: {
    name: localeCookieName,
  },
});

/** Routing values shared with the web application's locale adapter. */
export type RoutingConfig = typeof routing;

/** Reads a supported locale from the first non-empty pathname segment. */
export function getLocaleFromPathname(pathname: string): Locale | null {
  const firstSegment = pathname.split('/').filter(Boolean)[0];

  if (firstSegment !== undefined && isLocale(firstSegment)) {
    return firstSegment;
  }

  return null;
}
