import 'server-only';

export { getLocale, getMessages, getTranslations, setRequestLocale } from 'next-intl/server';

import type { Locale } from '#config/index';
import { defaultLocale, isLocale } from '#config/index';
import { getLocaleFromPathname } from '#routing/index';

/** Resolves locale in URL, cookie, then default order; this is not an authorization check. */
export function resolveRequestLocale(pathname: string, cookieLocale?: string): Locale {
  const urlLocale = getLocaleFromPathname(pathname);

  if (urlLocale !== null) {
    return urlLocale;
  }

  if (cookieLocale !== undefined && isLocale(cookieLocale)) {
    return cookieLocale;
  }

  return defaultLocale;
}

/** Async server adapter for request locale resolution using the same precedence rules. */
export async function getRequestLocale(pathname: string, cookieLocale?: string): Promise<Locale> {
  return resolveRequestLocale(pathname, cookieLocale);
}
