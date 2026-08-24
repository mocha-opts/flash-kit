import 'server-only';

import { defaultLocale } from '#config/index';
import { getLocaleFromPathname } from '#routing/index';

import type { Locale } from '#config/index';

export function resolveRequestLocale(pathname: string, cookieLocale?: string): Locale {
  const urlLocale = getLocaleFromPathname(pathname);

  if (urlLocale !== null) {
    return urlLocale;
  }

  if (cookieLocale === 'en' || cookieLocale === 'zh-CN') {
    return cookieLocale;
  }

  return defaultLocale;
}

export async function getRequestLocale(pathname: string, cookieLocale?: string): Promise<Locale> {
  return resolveRequestLocale(pathname, cookieLocale);
}

export async function getTranslations(): Promise<never> {
  throw new Error('Product message loading is implemented outside the T01 boundary scaffold.');
}
