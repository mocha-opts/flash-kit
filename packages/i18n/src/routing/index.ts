import { defaultLocale, isLocale, localePrefix } from '#config/index';

import type { Locale } from '#config/index';

export type RoutingConfig = {
  readonly locales: readonly Locale[];
  readonly defaultLocale: Locale;
  readonly localePrefix: 'as-needed';
};

export const routing: RoutingConfig = {
  locales: ['en', 'zh-CN'],
  defaultLocale,
  localePrefix,
};

export function getLocaleFromPathname(pathname: string): Locale | null {
  const firstSegment = pathname.split('/').filter(Boolean)[0];

  if (firstSegment !== undefined && isLocale(firstSegment)) {
    return firstSegment;
  }

  return null;
}
