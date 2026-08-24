import 'server-only';

import { defaultLocale, isLocale } from '#config/index';
import { getLocaleFromPathname } from '#routing/index';

import type { Locale } from '#config/index';

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

/**
 * Placeholder for loading product messages.
 *
 * @throws {Error} Always in T01 because message loading is not configured.
 */
export async function getTranslations(): Promise<never> {
  throw new Error('T01-not-configured: product message loading is not configured.');
}
